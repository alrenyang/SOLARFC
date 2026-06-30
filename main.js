import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, query, where, onSnapshot, doc, runTransaction } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Firebase 프로젝트 설정값
const firebaseConfig = {
    apiKey: "AIzaSyDn7oGNdD02WceJwIvz_zNitJx5bATD8jY",
    authDomain: "solrafc.firebaseapp.com",
    projectId: "solrafc",
    storageBucket: "solrafc.firebasestorage.app",
    messagingSenderId: "267444798176",
    appId: "1:267444798176:web:c85dcf7385aa02e5790685"
};

// 1. 세션 데이터 안전하게 가져오기
const isLoggedIn = sessionStorage.getItem("isLoggedIn");
const userId = sessionStorage.getItem("userId");
const userName = sessionStorage.getItem("userName") || "크루멤버"; // 이름이 없으면 기본값 설정

// 2. [로그아웃 기능 먼저 활성화] - 혹시 모를 에러로 멈추는 것을 방지하기 위해 상단 배치
const logoutBtn = document.getElementById('btn-logout');
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        sessionStorage.clear(); 
        alert("🔒 로그아웃 되었습니다.");
        window.location.href = "login.html";
    });
}

// 3. [접근 제어 변동] 로그인 정보가 비어있다면 에러를 내지 않고 안전하게 튕겨내기
if (isLoggedIn !== "true" || !userId) {
    alert("🔒 로그인이 필요한 페이지입니다. 로그인 화면으로 이동합니다.");
    window.location.href = "login.html";
}

// 상단 헤더에 이름 표시 ("조회 중..." 문구를 실제 이름으로 교체)
const userInfoElem = document.getElementById('user-info');
if (userInfoElem) {
    userInfoElem.innerText = `🏃‍♂️ ${userName}님`;
}

// Firebase 및 Firestore 초기화
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// --- 스케줄 조회 및 예약 시스템 실시간 핸들러 ---
const dateInput = document.getElementById('target-date');
const scheduleList = document.getElementById('schedule-list');

// Firestore 데이터 실시간 감시 함수
function loadSchedules(dateString) {
    if (!scheduleList) return;
    
    scheduleList.innerHTML = '<p class="loading">일정을 불러오는 중...</p>';

    const q = query(collection(db, "schedules"), where("date", "==", dateString));
    
    onSnapshot(q, (querySnapshot) => {
        scheduleList.innerHTML = '';
        
        if (querySnapshot.empty) {
            scheduleList.innerHTML = '<p class="no-data">📅 해당 날짜에 예정된 훈련이나 경기가 없습니다.</p>';
            return;
        }

        querySnapshot.forEach((docSnap) => {
            const schedule = docSnap.data();
            const scheduleId = docSnap.id;
            
            const card = document.createElement('div');
            card.className = 'schedule-card';
            
            const isFull = schedule.currentParticipants >= schedule.maxParticipants;

            card.innerHTML = `
                <div class="schedule-info">
                    <span class="badge">${schedule.time}</span>
                    <h4>${schedule.title}</h4>
                    <p>📍 장소: ${schedule.location}</p>
                    <p>👥 인원: ${schedule.currentParticipants} / ${schedule.maxParticipants}명</p>
                </div>
                <button class="btn-reserve" id="btn-${scheduleId}" ${isFull ? 'disabled' : ''}>
                    ${isFull ? '마감' : '예약하기'}
                </button>
            `;
            
            scheduleList.appendChild(card);

            document.getElementById(`btn-${scheduleId}`).addEventListener('click', () => {
                bookSchedule(scheduleId);
            });
        });
    }, (error) => {
        console.error("Firestore 에러:", error);
        scheduleList.innerHTML = '<p class="no-data">❌ 일정을 불러오는 중 오류가 발생했습니다. (보안 규칙 등을 확인하세요)</p>';
    });
}

// 선착순 예약을 위한 데이터베이스 트랜잭션
async function bookSchedule(scheduleId) {
    const scheduleRef = doc(db, "schedules", scheduleId);
    
    try {
        await runTransaction(db, async (transaction) => {
            const sfDoc = await transaction.get(scheduleRef);
            if (!sfDoc.exists()) throw "일정이 존재하지 않습니다.";

            const newPopulation = sfDoc.data().currentParticipants + 1;
            
            if (newPopulation <= sfDoc.data().maxParticipants) {
                transaction.update(scheduleRef, { currentParticipants: newPopulation });
            } else {
                return Promise.reject("정원이 마감되었습니다!");
            }
        });
        alert("⚽ 예약이 성공적으로 완료되었습니다!");
    } catch (e) {
        alert("예약 실패: " + e);
    }
}

// 날짜 변경 이벤트 리스너 추가
if (dateInput) {
    dateInput.addEventListener('change', (e) => loadSchedules(e.target.value));
    loadSchedules(dateInput.value);
}