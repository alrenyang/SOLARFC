import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDn7oGNdD02WceJwIvz_zNitJx5bATD8jY",
    authDomain: "solrafc.firebaseapp.com",
    projectId: "solrafc",
    storageBucket: "solrafc.firebasestorage.app",
    messagingSenderId: "267444798176",
    appId: "1:267444798176:web:c85dcf7385aa02e5790685"
};

// 1. 세션 데이터 검증
const isLoggedIn = sessionStorage.getItem("isLoggedIn");
const userId = sessionStorage.getItem("userId");
const userName = sessionStorage.getItem("userName") || "크루멤버";

// 2. 로그아웃 제어
const logoutBtn = document.getElementById('btn-logout');
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        sessionStorage.clear(); 
        alert("🔒 로그아웃 되었습니다.");
        window.location.href = "login.html";
    });
}

// 3. 보안 접근 통제
if (isLoggedIn !== "true" || !userId) {
    alert("🔒 로그인이 필요한 페이지입니다. 로그인 화면으로 이동합니다.");
    window.location.href = "login.html";
}

// 상단 헤더 프로필 닉네임 매핑
const userInfoElem = document.getElementById('user-info');
if (userInfoElem) {
    userInfoElem.innerText = `🏃‍♂️ ${userName}님`;
}

// 4. 사이드바 메뉴 클릭 제어 (✨ 별도 파일 연동을 위해 alert 차단 코드 완전 해제)
const menuIds = ['menu-home', 'menu-schedule', 'menu-members', 'menu-info', 'menu-account', 'menu-coupon'];
menuIds.forEach(id => {
    const menuElem = document.getElementById(id);
    if (menuElem) {
        menuElem.addEventListener('click', (e) => {
            // 주소가 빈 채로 '#' 만 들어가 있는 특수 예외 상황이 아니라면, e.preventDefault()를 작동시키지 않고
            // 각 HTML에 적혀있는 주소(member.html, info.html 등)로 정상 이동되도록 자연스럽게 열어둡니다.
            if (menuElem.getAttribute('href') === '#' || menuElem.getAttribute('href') === '') {
                e.preventDefault();
                alert("연동 주소가 바르게 세팅되지 않았습니다.");
            }
        });
    }
});

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);