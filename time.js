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

const sidebar = document.getElementById('sidebar');
const contentWrapper = document.getElementById('content-wrapper');
const toggleBtn = document.getElementById('btn-toggle');

if (toggleBtn && sidebar && contentWrapper) {
    toggleBtn.addEventListener('click', () => {
        if (window.innerWidth <= 768) {
            sidebar.classList.toggle('active');
        } else {
            sidebar.classList.toggle('collapsed');
            contentWrapper.classList.toggle('expanded');
        }
    });
}

const menuIds = ['menu-home', 'menu-schedule', 'menu-members'];
menuIds.forEach(id => {
    const menuElem = document.getElementById(id);
    if (menuElem) {
        menuElem.addEventListener('click', (e) => {
            e.preventDefault();
            menuIds.forEach(mId => document.getElementById(mId)?.classList.remove('active'));
            menuElem.classList.add('active');
            
            // ☀️ SOLAR FC 알림 문구 매핑
            if(id === 'menu-home') alert("SOLAR FC 홈 화면 준비 중입니다.");
            if(id === 'menu-members') alert("SOLAR FC 회원관리 데이터 준비 중입니다.");
        });
    }
});

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const dateInput = document.getElementById('target-date');
const scheduleList = document.getElementById('schedule-list');

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
        alert("🚨 파이어베이스 연동 실패 원인: " + error.message);
        scheduleList.innerHTML = `<p class="no-data">❌ 일정을 불러오는 중 오류가 발생했습니다.<br>(${error.code})</p>`;
    });
}

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

if (dateInput) {
    dateInput.addEventListener('change', (e) => loadSchedules(e.target.value));
    loadSchedules(dateInput.value);
}