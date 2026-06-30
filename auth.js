import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// ⚠️ 중요: Firebase 콘솔에서 발급받은 본인의 프로젝트 Key 정보들로 채워주세요!
const firebaseConfig = {
    apiKey: "AIzaSyDn7oGNdD02WceJwIvz_zNitJx5bATD8jY",
    authDomain: "solrafc.firebaseapp.com",
    projectId: "solrafc",
    storageBucket: "solrafc.firebasestorage.app",
    messagingSenderId: "267444798176",
    appId: "1:267444798176:web:c85dcf7385aa02e5790685"
};

// Firebase 모듈 활성화
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
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

// 인터랙션: 로그인/회원가입 모드 스위칭
loginTab.addEventListener('click', () => switchMode('login'));
signupTab.addEventListener('click', () => switchMode('signup'));

function switchMode(mode) {
    currentMode = mode;
    if (mode === 'signup') {
        loginTab.classList.remove('active');
        signupTab.classList.add('active');
        signupFields.forEach(field => field.style.display = 'block');
        submitBtnText.innerText = '회원가입 완료하기';
        subTitle.innerText = '새로운 크루 멤버 등록';
        document.getElementById('user-name').required = true;
        document.getElementById('user-phone').required = true;
    } else {
        signupTab.classList.remove('active');
        loginTab.classList.add('active');
        signupFields.forEach(field => field.style.display = 'none');
        submitBtnText.innerText = '로그인하기';
        subTitle.innerText = '클럽 회원 관리 시스템';
        document.getElementById('user-name').required = false;
        document.getElementById('user-phone').required = false;
    }
}

// 폼 서브밋 처리 (통합 Auth 핸들러)
authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('user-email').value;
    const password = document.getElementById('user-password').value;
    
    if (currentMode === 'signup') {
        const name = document.getElementById('user-name').value;
        const phone = document.getElementById('user-phone').value;
        
        try {
            // [Auth] 유저 계정 생성 생성
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            
            // [Firestore] 회원 가입 직후 해당 고유 식별자(UID) 매핑 문서 생성
            await setDoc(doc(db, "users", user.uid), {
                uid: user.uid,
                name: name,
                email: email,
                phoneNumber: phone,
                role: 'member', // 기본 권한 일반회원으로 정의 (추후 관리자는 직접 콘솔에서 'admin'으로 변경 가능)
                joinedDate: new Date().toISOString().split('T')[0]
            });
            
            alert(`⚽ ${name}님, 환영합니다! 회원가입이 완료되었습니다.`);
            window.location.href = "schedule.html"; // 메인 스케줄 페이지 파일명으로 변경하세요.
        } catch (error) {
            console.error("회원가입 에러 발생:", error);
            alert("회원가입 실패: " + getErrorMessage(error.code));
        }
    } else {
        // 로그인 로직 진행
        try {
            await signInWithEmailAndPassword(auth, email, password);
            alert("🔓 안전하게 로그인되었습니다.");
            window.location.href = "schedule.html";
        } catch (error) {
            console.error("로그인 에러 발생:", error);
            alert("로그인 실패: " + getErrorMessage(error.code));
        }
    }
});

// 구글 원클릭 소셜 로그인 핸들러
googleBtn.addEventListener('click', async () => {
    const provider = new GoogleAuthProvider();
    try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;
        
        // Firestore 데이터 적재 유무 분기 처리 (최초 진입시에만 기록)
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (!userDoc.exists()) {
            await setDoc(userDocRef, {
                uid: user.uid,
                name: user.displayName || "크루멤버",
                email: user.email,
                phoneNumber: user.phoneNumber || "",
                role: 'member',
                joinedDate: new Date().toISOString().split('T')[0]
            });
        }
        
        alert("🔓 소셜 계정으로 로그인되었습니다.");
        window.location.href = "schedule.html";
    } catch (error) {
        console.error("소셜 로그인 실패:", error);
        alert("Google 인증에 실패했습니다.");
    }
});

// Firebase 예외 코드 한글 디코딩 가이드
function getErrorMessage(code) {
    switch (code) {
        case 'auth/email-already-in-use': return '이미 가입된 이메일 주소입니다.';
        case 'auth/weak-password': return '보안을 위해 비밀번호를 6자리 이상 설정하세요.';
        case 'auth/invalid-email': return '이메일 주소 형태가 올바르지 않습니다.';
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential': return '가입정보가 없거나 비밀번호가 틀렸습니다.';
        default: return '네트워크 통신 오류 혹은 알 수 없는 예외가 발생했습니다.';
    }
}