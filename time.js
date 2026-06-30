import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, query, where, onSnapshot, doc, runTransaction } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDn7oGNdD02WceJwIvz_zNitJx5bATD8jY",
    authDomain: "solrafc.firebaseapp.com",
    projectId: "solrafc",
    storageBucket: "solrafc.firebasestorage.app",
    messagingSenderId: "267444798176",
    appId: "1:267444798176:web:c85dcf7385aa02e5790685"
};

// 1. 세션 보안 검증
const isLoggedIn = sessionStorage.getItem("isLoggedIn");
const userId = sessionStorage.getItem("userId");
const userName = sessionStorage.getItem("userName") || "크루멤버";

const logoutBtn = document.getElementById('btn-logout');
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        sessionStorage.clear(); 
        alert("🔒 로그아웃 되었습니다.");
        window.location.href = "login.html";
    });
}

if (isLoggedIn !== "true" || !userId) {
    alert("🔒 로그인이 필요한 페이지입니다. 로그인 화면으로 이동합니다.");
    window.location.href = "login.html";
}

const userInfoElem = document.getElementById('user-info');
if (userInfoElem) {
    userInfoElem.innerText = `🏃‍♂️ ${userName}님`;
}

// 2. [사이드바 메뉴 클릭 제어] - 주소 이동 허용 및 준비 중 메뉴 필터링
const menuIds = ['menu-home', 'menu-schedule', 'menu-members'];
menuIds.forEach(id => {
    const menuElem = document.getElementById(id);
    if (menuElem) {
        menuElem.addEventListener('click', (e) => {
            if (menuElem.getAttribute('href') === '#' || menuElem.getAttribute('href') === '') {
                e.preventDefault();
                alert("SOLAR FC 회원 정보 관리 기능은 현재 준비 중입니다.");
            }
        });
    }
});

// 3. 📅 [모바일 최적화] 주간 달력 생성 로직 (2026년 기준 매핑 가능)
let selectedDate = new Date().toISOString().split('T')[0]; // 오늘 날짜 기본 세팅

function initWeeklyCalendar() {
    const weekDaysContainer = document.getElementById('week-days-container');
    const monthYearTitle = document.getElementById('current-month-year');
    if (!weekDaysContainer) return;

    const today = new Date();
    const currentDayOfWeek = today.getDay(); 
    
    const startOfWeek = new Date(today);
    const distanceToMonday = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;
    startOfWeek.setDate(today.getDate() + distanceToMonday);

    const dayNames = ['월', '화', '수', '목', '금', '토', '일'];
    weekDaysContainer.innerHTML = '';

    for (let i = 0; i < 7; i++) {
        const loopDate = new Date(startOfWeek);
        loopDate.setDate(startOfWeek.getDate() + i);

        const dateString = loopDate.toISOString().split('T')[0]; 
        const dayNum = loopDate.getDate();

        const button = document.createElement('button');
        button.className = `day-tab ${dateString === selectedDate ? 'active' : ''}`;
        button.dataset.date = dateString;

        button.innerHTML = `
            <span class="day-name">${dayNames[i]}</span>
            <span class="day-num">${dayNum}</span>
        `;

        button.addEventListener('click', () => {
            document.querySelectorAll('.day-tab').forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            selectedDate = dateString;
            loadSchedules(selectedDate);
        });

        weekDaysContainer.appendChild(button);
    }

    monthYearTitle.innerText = `${today.getFullYear()}년 ${today.getMonth() + 1}월`;
}

// Firebase 데이터베이스 초기화
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const scheduleList = document.getElementById('schedule-list');

// 4. 실시간 Firestore 일정 바인딩 (onSnapshot)
function loadSchedules(dateString) {
    if (!scheduleList) return;
    
    scheduleList.innerHTML = '<p class="loading">일정을 불러오는 중입니다...</p>';

    const q = query(collection(db, "schedules"), where("date", "==", dateString));
    
    onSnapshot(q, (querySnapshot) => {
        scheduleList.innerHTML = '';
        
        if (querySnapshot.empty) {
            scheduleList.innerHTML = '<p class="no-data">📅 해당 날짜에 예정된 SOLAR FC 훈련이나 경기가 없습니다.</p>';
            return;
        }

        const sortedDocs = [];
        querySnapshot.forEach(doc => sortedDocs.push({id: doc.id, ...doc.data()}));
        sortedDocs.sort((a, b) => a.time.localeCompare(b.time));

        sortedDocs.forEach((schedule) => {
            const card = document.createElement('div');
            card.className = 'timeline-card';
            
            const isFull = schedule.currentParticipants >= schedule.maxParticipants;

            card.innerHTML = `
                <div class="time-box">⌚ ${schedule.time}</div>
                <div class="session-main">
                    <h4>${schedule.title}</h4>
                    <p>📍 장소: ${schedule.location}</p>
                    <span class="status-badge ${isFull ? '' : 'available'}">
                        ${isFull ? '정원 마감' : `신청 가능 (${schedule.currentParticipants}/${schedule.maxParticipants}명)`}
                    </span>
                </div>
                <button class="btn-reserve" id="btn-${schedule.id}" ${isFull ? 'disabled' : ''}>
                    ${isFull ? '마감' : '예약'}
                </button>
            `;
            
            scheduleList.appendChild(card);

            document.getElementById(`btn-${schedule.id}`).addEventListener('click', () => {
                bookSchedule(schedule.id);
            });
        });
    }, (error) => {
        console.error("Firestore 에러:", error);
        alert("🚨 파이어베이스 연동 실패 원인: " + error.message);
    });
}

// 선착순 동시성 트랜잭션 예약 함수
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
        alert("⚽ 매치 예약이 완료되었습니다!");
    } catch (e) {
        alert("예약 실패: " + e);
    }
}

// 초기 로딩 프로세서 가동
initWeeklyCalendar();
loadSchedules(selectedDate);