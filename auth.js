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

let currentMode = 'login';

const loginTab = document.getElementById('tab-login');
const signupTab = document.getElementById('tab-signup');
const signupFields = document.querySelectorAll('.signup-only');
const submitBtnText = document.getElementById('btn-submit-text');
const subTitle = document.getElementById('sub-title');
const authForm = document.getElementById('auth-form');
const googleBtn = document.getElementById('btn-google-login');

if (googleBtn) googleBtn.style.display = 'none'; 

const emailInput = document.getElementById('user-email');
if (emailInput) {
    emailInput.placeholder = "사용할 아이디를 입력하세요";
    emailInput.type = "text"; 
}

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

if (authForm) {
    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const userId = document.getElementById('user-email').value.trim();
        const password = document.getElementById('user-password').value;
        
        if (currentMode === 'signup') {
            const name = document.getElementById('user-name').value;
            const phone = document.getElementById('user-phone').value;
            
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
                switchMode('login');
                authForm.reset();
                
            } catch (error) {
                console.error("회원가입 처리 중 에러:", error);
                alert(`🚨 SOLAR FC 회원가입 실패 원인:\n[${error.code}]\n${error.message}`);
            }
        } else {
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
                    
                    // 👈 로그인 성공 후 메인 홈 화면(index.html)으로 이동합니다.
                    window.location.href = "index.html";
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