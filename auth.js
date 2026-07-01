import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDn7oGNdD02WceJwIvz_zNitJx5bATD8jY",
    authDomain: "solrafc.firebaseapp.com",
    projectId: "solrafc",
    storageBucket: "solrafc.firebasestorage.app",
    messagingSenderId: "267444798176",
    appId: "1:267444798176:web:c85dcf7385aa02e5790685"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ── 💡 모듈 스코프 내부 변수로 모드 안전하게 고정 ──
let currentMode = 'login'; 

const tabLogin = document.getElementById('tab-login');
const tabSignup = document.getElementById('tab-signup');
const tabGuest = document.getElementById('tab-guest');

const groupName = document.getElementById('group-name');
const groupEmail = document.getElementById('group-email');
const groupPassword = document.getElementById('group-password');
const groupPhone = document.getElementById('group-phone');

const submitText = document.getElementById('btn-submit-text');
const subTitleText = document.getElementById('sub-title');

const inputName = document.getElementById('user-name');
const inputEmail = document.getElementById('user-email');
const inputPassword = document.getElementById('user-password');
const inputPhone = document.getElementById('user-phone');
const authForm = document.getElementById('auth-form');

// 탭 컴포넌트 화면 가시성 제어용 공통 초기화 함수
function switchAuthUI(mode) {
    currentMode = mode;
    
    // 활성 탭 불빛 초기화
    [tabLogin, tabSignup, tabGuest].forEach(btn => btn?.classList.remove('active'));
    // 입력 필드 숨김 초기화
    [groupName, groupEmail, groupPassword, groupPhone].forEach(div => { if(div) div.style.display = 'none'; });
    // 필수 제약 조건 초기화
    [inputName, inputEmail, inputPassword, inputPhone].forEach(inp => { if(inp) inp.required = false; });

    if (mode === 'login') {
        tabLogin?.classList.add('active');
        if(groupEmail) groupEmail.style.display = 'block';
        if(groupPassword) groupPassword.style.display = 'block';
        if(inputEmail) inputEmail.required = true;
        if(inputPassword) inputPassword.required = true;
        if(submitText) submitText.innerText = '로그인하기';
        if(subTitleText) subTitleText.innerText = '클럽 회원 관리 시스템';
    } 
    else if (mode === 'signup') {
        tabSignup?.classList.add('active');
        [groupName, groupEmail, groupPassword, groupPhone].forEach(div => { if(div) div.style.display = 'block'; });
        [inputName, inputEmail, inputPassword, inputPhone].forEach(inp => { if(inp) inp.required = true; });
        if(submitText) submitText.innerText = '회원가입 완료하기';
        if(subTitleText) subTitleText.innerText = '새로운 크루 멤버 등록';
    } 
    else if (mode === 'guest') {
        tabGuest?.classList.add('active');
        if(groupName) groupName.style.display = 'block';
        if(groupPhone) groupPhone.style.display = 'block';
        if(inputName) inputName.required = true;
        if(inputPhone) inputPhone.required = true;
        if(submitText) submitText.innerText = '비회원으로 입장하기';
        if(subTitleText) subTitleText.innerText = '임시 게스트 및 비회원 입장';
    }
}

// 탭 메뉴 버튼 이벤트 리스너 이식
tabLogin?.addEventListener('click', () => switchAuthUI('login'));
tabSignup?.addEventListener('click', () => switchAuthUI('signup'));
tabGuest?.addEventListener('click', () => switchAuthUI('guest'));

// 초깃값 구동
switchAuthUI('login');

// 연락처 입력 시 대시(-) 자동 바인딩 자동화 UX
if (inputPhone) {
    inputPhone.addEventListener('input', (e) => {
        let value = e.target.value.replace(/[^0-9]/g, '');
        let result = '';
        if (value.length < 4) result = value;
        else if (value.length < 7) result = value.substr(0, 3) + '-' + value.substr(3);
        else if (value.length < 11) result = value.substr(0, 3) + '-' + value.substr(3, 3) + '-' + value.substr(6);
        else result = value.substr(0, 3) + '-' + value.substr(3, 4) + '-' + value.substr(7);
        e.target.value = result;
    });
}

// ── 🔥 백엔드 폼 전송 이벤트 핸들러 고도화 ──
if (authForm) {
    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const name = inputName?.value.trim() || "";
        const phone = inputPhone?.value.trim() || "";
        const userId = inputEmail?.value.trim() || "";
        const password = inputPassword?.value || "";
        
        // 1. [회원가입 처리 모드]
        if (currentMode === 'signup') {
            try {
                const userDocRef = doc(db, "users", userId);
                const userDocSnap = await getDoc(userDocRef);
                
                if (userDocSnap.exists()) {
                    alert("❌ 이미 존재하는 아이디입니다. 다른 아이디를 사용해주세요.");
                    return;
                }
                
                await setDoc(userDocRef, {
                    userId: userId,
                    password: password, 
                    name: name,
                    phoneNumber: phone,
                    role: 'member', 
                    joinedDate: new Date().toISOString().split('T')[0]
                });
                
                alert(`⚽ ${name}님, 가입을 축하합니다! 가입하신 아이디로 로그인해 주세요.`);
                switchAuthUI('login');
                authForm.reset();
                
            } catch (error) {
                console.error("회원가입 처리 오류:", error);
                alert(`🚨 회원가입 실패 원인:\n${error.message}`);
            }
        } 
        // 2. [비회원 로그인 처리 모드]
        else if (currentMode === 'guest') {
            try {
                const cleanPhone = phone.replace(/[^0-9]/g, '');
                const guestId = `G-${cleanPhone}`; // 고유 비회원 식별 코드 가공

                const userDocRef = doc(db, "users", guestId);
                const userDocSnap = await getDoc(userDocRef);

                let finalUserData = null;

                if (userDocSnap.exists()) {
                    finalUserData = userDocSnap.data();
                } else {
                    // 최초 접속하는 비회원의 경우 기본 프로필 Firestore 실시간 동적 삽입
                    const newGuestData = {
                        userId: guestId,
                        password: "", 
                        name: name,
                        phoneNumber: phone,
                        role: 'guest', 
                        joinedDate: new Date().toISOString().split('T')[0]
                    };
                    await setDoc(userDocRef, newGuestData);
                    finalUserData = newGuestData;
                }

                alert(`🔓 비회원(게스트) 로그인 성공! ${finalUserData.name}님 환영합니다.`);

                // 세션 토큰 스토리지 저장 후 index.html 이동
                sessionStorage.setItem("isLoggedIn", "true");
                sessionStorage.setItem("userId", finalUserData.userId);
                sessionStorage.setItem("userName", finalUserData.name);
                sessionStorage.setItem("userRole", finalUserData.role);

                window.location.href = "index.html";

            } catch (error) {
                console.error("비회원 처리 오류:", error);
                alert(`🚨 비회원 로그인 처리 도중 에러가 발생했습니다:\n${error.message}`);
            }
        } 
        // 3. [일반 정식 회원 로그인 처리 모드]
        else {
            try {
                const userDocRef = doc(db, "users", userId);
                const userDocSnap = await getDoc(userDocRef);
                
                if (!userDocSnap.exists()) {
                    alert("❌ 존재하지 않는 아이디입니다.");
                    return;
                }
                
                const userData = userDocSnap.data();
                
                if (userData.password === password) {
                    alert(`🔓 로그인 성공! ${userData.name}님 환영합니다.`);
                    
                    sessionStorage.setItem("isLoggedIn", "true");
                    sessionStorage.setItem("userId", userData.userId);
                    sessionStorage.setItem("userName", userData.name);
                    sessionStorage.setItem("userRole", userData.role);
                    
                    window.location.href = "index.html";
                } else {
                    alert("❌ 비밀번호가 올바르지 않습니다.");
                }
                
            } catch (error) {
                console.error("일반 로그인 오류:", error);
                alert("로그인 도중 기술 오류가 발생했습니다.");
            }
        }
    });
}