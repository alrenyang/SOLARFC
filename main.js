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

// 2. 보안 접근 통제 (미로그인 시 튕겨내기)
if (isLoggedIn !== "true" || !userId) {
    alert("🔒 로그인이 필요한 페이지입니다. 로그인 화면으로 이동합니다.");
    window.location.href = "login.html";
}

// 3. 🚨 [핵심 기능] 관리자 권한 메뉴 필터링 
// 아이디가 '관리자'가 아니면 회원관리(menu-members)와 계정관리(menu-account)를 숨깁니다.
if (userId !== "관리자") {
    const adminMenus = ['menu-members', 'menu-account'];
    adminMenus.forEach(id => {
        const menuElem = document.getElementById(id);
        if (menuElem) {
            // 부모 li 태그를 통째로 숨겨서 메뉴바 간격을 깔끔하게 유지합니다.
            menuElem.parentElement.style.display = 'none';
        }
    });
}

// 4. 로그아웃 제어
const logoutBtn = document.getElementById('btn-logout');
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        sessionStorage.clear(); 
        alert("🔒 로그아웃 되었습니다.");
        window.location.href = "login.html";
    });
}

// 상단 헤더 프로필 닉네임 매핑
const userInfoElem = document.getElementById('user-info');
if (userInfoElem) {
    userInfoElem.innerText = `🏃‍♂️ ${userName}님`;
}

// 5. 사이드바 메뉴 클릭 제어
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

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);