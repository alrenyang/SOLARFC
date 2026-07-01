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
if (userInfoElem) userInfoElem.innerText = `🏃‍♂️ ${userName}님`;

// 메뉴 클릭 제어 (새 HTML 독립 리다이렉트 완전 개방)
const menuIds = ['menu-home', 'menu-schedule', 'menu-members', 'menu-info', 'menu-account', 'menu-coupon'];
menuIds.forEach(id => {
    const menuElem = document.getElementById(id);
    if (menuElem) {
        menuElem.addEventListener('click', (e) => {
            if (menuElem.getAttribute('href') === '#' || menuElem.getAttribute('href') === '') {
                e.preventDefault();
                alert("연동 주소가 바르게 세팅되지 않았습니다.");
            }
        });
    }
});

let currentViewDate = new Date(); 
let currentSelectedMonday = new Date(); 
let selectedDate = new Date().toISOString().split('T')[0]; 

function getMonday(d) {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); 
    return new Date(date.setDate(diff));
}

currentSelectedMonday = getMonday(new Date());

function updateWeeklyTabs() {
    const weekDaysContainer = document.getElementById('week-days-container');
    const weekRangeTitle = document.getElementById('current-week-range');
    if (!weekDaysContainer || !weekRangeTitle) return;

    const dayNames = ['월', '화', '수', '목', '금', '토', '일'];
    weekDaysContainer.innerHTML = '';

    const sundayDate = new Date(currentSelectedMonday);
    sundayDate.setDate(currentSelectedMonday.getDate() + 6);

    const pad = (n) => String(n).padStart(2, '0');
    const startStr = `${pad(currentSelectedMonday.getMonth()+1)}.${pad(currentSelectedMonday.getDate())}(월)`;
    const endStr = `${pad(sundayDate.getMonth()+1)}.${pad(sundayDate.getDate())}(일)`;
    weekRangeTitle.innerText = `${currentSelectedMonday.getFullYear()}년 ${startStr} - ${endStr}`;

    for (let i = 0; i < 7; i++) {
        const loopDate = new Date(currentSelectedMonday);
        loopDate.setDate(currentSelectedMonday.getDate() + i);
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
}

function renderModalCalendar() {
    const daysGridBody = document.getElementById('modal-days-grid-body');
    const modalMonthTitle = document.getElementById('modal-month-title');
    if (!daysGridBody || !modalMonthTitle) return;

    daysGridBody.innerHTML = '';
    const year = currentViewDate.getFullYear();
    const month = currentViewDate.getMonth();

    modalMonthTitle.innerText = `${year}년 ${String(month + 1).padStart(2, '0')}월`;

    const firstDayOfMonth = new Date(year, month, 1);
    let startMonday = getMonday(firstDayOfMonth); 

    const pad = (n) => String(n).padStart(2, '0');
    const currentSelectedMondayStr = `${currentSelectedMonday.getFullYear()}-${pad(currentSelectedMonday.getMonth()+1)}-${pad(currentSelectedMonday.getDate())}`;

    for (let w = 0; w < 6; w++) {
        const rowMonday = new Date(startMonday);
        rowMonday.setDate(startMonday.getDate() + (w * 7));

        const weekRowGroup = document.createElement('div');
        weekRowGroup.className = 'calendar-row-group';
        
        const rowMondayStr = `${rowMonday.getFullYear()}-${pad(rowMonday.getMonth()+1)}-${pad(rowMonday.getDate())}`;
        if (rowMondayStr === currentSelectedMondayStr) {
            weekRowGroup.classList.add('selected-week'); 
        }

        let hasDaysInCurrentMonth = false;

        for (let d = 0; d < 7; d++) {
            const targetDay = new Date(rowMonday);
            targetDay.setDate(rowMonday.getDate() + d);

            const dayDiv = document.createElement('div');
            dayDiv.className = 'cal-day';
            dayDiv.innerText = targetDay.getDate();

            if (targetDay.getMonth() !== month) {
                dayDiv.classList.add('other-month'); 
            } else {
                hasDaysInCurrentMonth = true;
            }
            weekRowGroup.appendChild(dayDiv);
        }

        if (w === 5 && !hasDaysInCurrentMonth) break;

        weekRowGroup.addEventListener('click', () => {
            currentSelectedMonday = rowMonday;
            selectedDate = rowMonday.toISOString().split('T')[0]; 
            updateWeeklyTabs();
            loadSchedules(selectedDate);
            document.getElementById('calendar-modal-overlay').classList.remove('show');
        });

        daysGridBody.appendChild(weekRowGroup);
    }
}

const modalOverlay = document.getElementById('calendar-modal-overlay');
const modalContent = document.getElementById('calendar-modal-content');
const btnOpenCal = document.getElementById('btn-open-cal');
const btnCloseCal = document.getElementById('btn-close-cal');

if (btnOpenCal) {
    btnOpenCal.addEventListener('click', () => {
        currentViewDate = new Date(currentSelectedMonday); 
        renderModalCalendar();
        modalOverlay.classList.add('show');
    });
}
if (btnCloseCal) btnCloseCal.addEventListener('click', () => modalOverlay.classList.remove('show'));
if (modalOverlay) modalOverlay.addEventListener('click', () => modalOverlay.classList.remove('show'));
if (modalContent) modalContent.addEventListener('click', (e) => e.stopPropagation()); 

document.getElementById('btn-prev-month')?.addEventListener('click', () => {
    currentViewDate.setMonth(currentViewDate.getMonth() - 1);
    renderModalCalendar();
});
document.getElementById('btn-next-month')?.addEventListener('click', () => {
    currentViewDate.setMonth(currentViewDate.getMonth() + 1);
    renderModalCalendar();
});

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const scheduleList = document.getElementById('schedule-list');

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
            document.getElementById(`btn-${schedule.id}`).addEventListener('click', () => bookSchedule(schedule.id));
        });
    }, (error) => {
        console.error("Firestore 에러:", error);
        alert("🚨 파이어베이스 연동 실패 원인: " + error.message);
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
            } else { return Promise.reject("정원이 마감되었습니다!"); }
        });
        alert("⚽ 매치 예약이 완료되었습니다!");
    } catch (e) { alert("예약 실패: " + e); }
}

updateWeeklyTabs();
loadSchedules(selectedDate);