import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Firebase 프로젝트 설정값 (정확히 잘 반영되었습니다!)
const firebaseConfig = {
    apiKey: "AIzaSyDn7oGNdD02WceJwIvz_zNitJx5bATD8jY",
    authDomain: "solrafc.firebaseapp.com",
    projectId: "solrafc",
    storageBucket: "solrafc.firebasestorage.app",
    messagingSenderId: "267444798176",
    appId: "1:267444798176:web:c85dcf7385aa02e5790685"
};

// Firebase 및 Firestore 초기화
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let currentMode = 'login';

// DOM 엘리먼트 정의
const loginTab = document.getElementById('tab-login');
const signupTab = document.getElementById('tab-signup');
const signupFields = document.querySelectorAll('.signup-only');
const submitBtnText = document.getElementById('btn-submit-text');
const subTitle = document.getElementById('sub-title');
const authForm = document.getElementById('auth-form');
const googleBtn = document.getElementById('btn-google-login');

// 구글 버튼 숨기기
if (googleBtn) googleBtn.style.display = 'none'; 

// 일반 아이디 양식으로 셋팅
const emailInput = document.getElementById('user-email');
if (emailInput) {
    emailInput.placeholder = "사용할 아이디를 입력하세요";
    emailInput.type = "text"; 
}

// 인터랙션: 로그인/회원가입 모드 스위칭
if (loginTab) loginTab.addEventListener('click', () => switchMode('login'));
if (signupTab) signupTab.addEventListener('click', () => switchMode('signup'));

function switchMode(mode) {
    currentMode = mode;
    if (mode === 'signup') {
        if (loginTab) loginTab.classList.remove('active');
        if (signupTab) signupTab.classList.add('active');
        signupFields.forEach(field => field.style.display = 'block');
        if (submitBtnText) submitBtnText.innerText = '회원가입 완료하기';
        if (subTitle) subTitle.innerText = '새로운 크루 멤버 등록';
        document.getElementById('user-name').required = true;
        document.getElementById('user-phone').required = true;
    } else {
        if (signupTab) signupTab.classList.remove('active');
        if (loginTab) loginTab.classList.add('active');
        signupFields.forEach(field => field.style.display = 'none');
        if (submitBtnText) submitBtnText.innerText = '로그인하기';
        if (subTitle) subTitle.innerText = '클럽 회원 관리 시스템';
        document.getElementById('user-name').required = false;
        document.getElementById('user-phone').required = false;
    }
}

// 폼 서브밋 처리 (자체 DB 기반 로그인/회원가입 로직)
if (authForm) {
    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const userId = document.getElementById('user-email').value.trim(); // 사용자가 입력한 아이디
        const password = document.getElementById('user-password').value;   // 사용자가 입력한 비밀번호
        
        if (currentMode === 'signup') {
            const name = document.getElementById('user-name').value;
            const phone = document.getElementById('user-phone').value;
            
            try {
                // 1. 아이디 중복 체크
                const userDocRef = doc(db, "users", userId);
                const userDocSnap = await getDoc(userDocRef);
                
                if (userDocSnap.exists()) {
                    alert("❌ 이미 존재하는 아이디입니다. 다른 아이디를 사용해주세요.");
                    return;
                }
                
                // 2. 중복이 없다면 Firestore의 'users' 컬렉션에 새 회원 문서 생성
                await setDoc(userDocRef, {
                    userId: userId,
                    password: password, 
                    name: name,
                    phoneNumber: phone,
                    role: 'member', 
                    joinedDate: new Date().toISOString().split('T')[0]
                });
                
                // [수정 완료] 가입 축하 문구 출력 후, 로그인 화면으로 이동시켜서 다시 로그인하게 유도
                alert(`⚽ ${name}님, 가입을 축하합니다! 가입하신 아이디로 로그인해 주세요.`);
                switchMode('login');
                
                // 가입 폼 초기화
                authForm.reset();
                
            } catch (error) {
                console.error("회원가입 처리 중 에러:", error);
                alert("회원가입에 실패했습니다. 콘솔 로그를 확인하세요.");
            }
        } else {
            // 로그인 로직 진행
            try {
                // Firestore에서 사용자가 입력한 ID 문서 가져오기
                const userDocRef = doc(db, "users", userId);
                const userDocSnap = await getDoc(userDocRef);
                
                if (!userDocSnap.exists()) {
                    alert("❌ 존재하지 않는 아이디입니다.");
                    return;
                }
                
                const userData = userDocSnap.data();
                
                // 입력한 비밀번호와 DB에 저장된 비밀번호가 일치하는지 비교
                if (userData.password === password) {
                    // [수정 완료] 알림창 내용 정상화
                    alert(`🔓 로그인 성공! ${userData.name}님 환영합니다.`);
                    
                    // 로그인 상태를 브라우저 세션에 저장 (index.html에서 확인용)
                    sessionStorage.setItem("isLoggedIn", "true");
                    sessionStorage.setItem("userId", userData.userId);
                    sessionStorage.setItem("userName", userData.name);
                    sessionStorage.setItem("userRole", userData.role);
                    
                    // [수정 완료] 로그인 성공 즉시 index.html 메인 스케줄 페이지로 이동
                    window.location.href = "time.html";
                } else {
                    alert("❌ 비밀번호가 올바르지 않습니다.");
                }
                
            } catch (error) {
                console.error("로그인 처리 중 에러:", error);
                alert("로그인 도중 오류가 발생했습니다.");
            }
        }
    });
}