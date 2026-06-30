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

// 1. 세션 데이터 안전하게 가져오기
const isLoggedIn = sessionStorage.getItem("isLoggedIn");
const userId = sessionStorage.getItem("userId");
const userName = sessionStorage.getItem("userName") || "크루멤버";

// 2. [로그아웃 기능]
const logoutBtn = document.getElementById('btn-logout');
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        sessionStorage.clear(); 
        alert("🔒 로그아웃 되었습니다.");
        window.location.href = "login.html";
    });
}

// 3. [보안 접근 제어] 로그인 상태 확인 (홈화면 무한루프 방지용 login.html 검증)
if (isLoggedIn !== "true" || !userId) {
    alert("🔒 로그인이 필요한 페이지입니다. 로그인 화면으로 이동합니다.");
    window.location.href = "login.html";
}

// 상단 헤더 유저 이름 매핑
const userInfoElem = document.getElementById('user-info');
if (userInfoElem) {
    userInfoElem.innerText = `🏃‍♂️ ${userName}님`;
}

// 4. [사이드바 메뉴 클릭 제어] - 홈, 일정관리는 정상 이동 / 회원관리만 차단 후 알림창
const menuIds = ['menu-home', 'menu-schedule', 'menu-members'];
menuIds.forEach(id => {
    const menuElem = document.getElementById(id);
    if (menuElem) {
        menuElem.addEventListener('click', (e) => {
            // href가 '#' 이거나 비어있는 경우(즉, 주소가 없는 회원관리 메뉴)만 강제 차단 후 알림
            if (menuElem.getAttribute('href') === '#' || menuElem.getAttribute('href') === '') {
                e.preventDefault();
                alert("SOLAR FC 회원 정보 관리 기능은 현재 준비 중입니다.");
            }
            // index.html 또는 time.html 주소가 적힌 메뉴는 e.preventDefault()를 타지 않으므로 정상 작동합니다.
        });
    }
});

// Firebase 및 Firestore 초기화 (향후 홈 화면 데이터 필요 시 확장 영역)
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);