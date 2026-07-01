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

// 모듈 내부 스코프 상태 플래그 고정
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

// 탭 UI 제어 및 필드 초기화 솔루션
function switchAuthUI(mode) {
    currentMode = mode;
    
    [tabLogin, tabSignup, tabGuest].forEach(btn => btn?.classList.remove('active'));
    [groupName, groupEmail, groupPassword, groupPhone].forEach(div => { if(div) div.style.display = 'none'; });
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

tabLogin?.addEventListener('click', () => switchAuthUI('login'));
tabSignup?.addEventListener('click', () => switchAuthUI('signup'));
tabGuest?.addEventListener('click', () => switchAuthUI('guest'));

// 최초 로그인 상태 세팅 가동
switchAuthUI('login');

// 연락처 하이픈 오토 하이라이터
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

// ── 🔥 [수정 포인트] 서브밋 핸들러 분기 조건 논리 격리 최적화 ──
if (authForm) {
    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // 💥 [핵심 해결] 비회원 모드일 때는 다른 모드의 입력값 변수 참조를 원천 격리하여 에러 차단
        if (currentMode === 'guest') {
            const guestName = inputName?.value.trim() || "";
            const guestPhone = inputPhone?.value.trim() || "";

            if (!guestName || !guestPhone) {
                alert("❌ 이름과 연락처를 모두 입력해주세요.");
                return;
            }

            try {
                const cleanPhone = guestPhone.replace(/[^0-9]/g, '');
                const guestId = `G-${cleanPhone}`; 

                const userDocRef = doc(db, "users", guestId);
                const userDocSnap = await getDoc(userDocRef);

                let finalUserData = null;

                if (userDocSnap.exists()) {
                    finalUserData = userDocSnap.data();
                } else {
                    const newGuestData = {
                        userId: guestId,
                        password: "", 
                        name: guestName,
                        phoneNumber: guestPhone,
                        role: 'guest', 
                        joinedDate: new Date().toISOString().split('T')[0]
                    };
                    await setDoc(userDocRef, newGuestData);
                    finalUserData = newGuestData;
                }

                alert(`🔓 비회원(게스트) 로그인 성공! ${finalUserData.name}님 환영합니다.`);

                sessionStorage.setItem("isLoggedIn", "true");
                sessionStorage.setItem("userId", finalUserData.userId);
                sessionStorage.setItem("userName", finalUserData.name);
                sessionStorage.setItem("userRole", finalUserData.role);

                window.location.href = "index.html";
                return; // 함수 조기 종료로 아래 일반 로그인 로직 침범 원천 차단

            } catch (error) {
                console.error("비회원 처리 예외:", error);
                alert(`🚨 비회원 로그인 처리 중 실패: ${error.message}`);
                return;
            }
        }

        // 3. [회원가입 처리 모드]
        if (currentMode === 'signup') {
            const signupName = inputName?.value.trim() || "";
            const signupPhone = inputPhone?.value.trim() || "";
            const signupId = inputEmail?.value.trim() || "";
            const signupPassword = inputPassword?.value || "";

            try {
                const userDocRef = doc(db, "users", signupId);
                const userDocSnap = await getDoc(userDocRef);
                
                if (userDocSnap.exists()) {
                    alert("❌ 이미 존재하는 아이디입니다. 다른 아이디를 사용해주세요.");
                    return;
                }
                
                await setDoc(userDocRef, {
                    userId: signupId,
                    password: signupPassword, 
                    name: signupName,
                    phoneNumber: signupPhone,
                    role: 'member', 
                    joinedDate: new Date().toISOString().split('T')[0]
                });
                
                alert(`⚽ ${signupName}님, 가입을 축하합니다! 가입하신 아이디로 로그인해 주세요.`);
                switchAuthUI('login');
                authForm.reset();
                
            } catch (error) {
                console.error("회원가입 처리 오류:", error);
                alert(`🚨 회원가입 실패 원인:\n${error.message}`);
            }
        } 
        // 4. [일반 정식 회원 로그인 처리 모드]
        else if (currentMode === 'login') {
            const loginId = inputEmail?.value.trim() || "";
            const loginPassword = inputPassword?.value || "";

            try {
                const userDocRef = doc(db, "users", loginId);
                const userDocSnap = await getDoc(userDocRef);
                
                if (!userDocSnap.exists()) {
                    alert("❌ 존재하지 않는 아이디입니다.");
                    return;
                }
                
                const userData = userDocSnap.data();
                
                if (userData.password === loginPassword) {
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
                alert("🔒 로그인 도중 기술 오류가 발생했습니다.");
            }
        }
    });
}