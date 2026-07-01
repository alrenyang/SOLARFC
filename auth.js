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

const authForm = document.getElementById('auth-form');

if (authForm) {
    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // 상단 HTML script 영역의 전역 상태 플래그를 안정적으로 참조합니다.
        const mode = window.currentAuthMode || 'login';
        
        const name = document.getElementById('user-name').value.trim();
        const phone = document.getElementById('user-phone').value.trim();
        const userId = document.getElementById('user-email').value.trim();
        const password = document.getElementById('user-password').value;
        
        // ── 1. 회원가입 프로세스 ──
        if (mode === 'signup') {
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
                document.getElementById('tab-login').click(); // 로그인 탭으로 자동 회귀
                authForm.reset();
                
            } catch (error) {
                console.error("회원가입 에러:", error);
                alert(`🚨 회원가입 실패: ${error.message}`);
            }
        } 
        // ── 2. 비회원 로그인 프로세스 (✨ NEW) ──
        else if (mode === 'guest') {
            try {
                // 하이픈을 제거한 번호로 게스트 아이디 임시 식별자 추출 (예: G-01012345678)
                const cleanPhone = phone.replace(/[^0-9]/g, '');
                const guestId = `G-${cleanPhone}`;

                const userDocRef = doc(db, "users", guestId);
                const userDocSnap = await getDoc(userDocRef);

                let finalUserData = null;

                // 이미 가입된 내역이 있는 비회원이면 기존 정보 연동
                if (userDocSnap.exists()) {
                    finalUserData = userDocSnap.data();
                } else {
                    // 처음 방문한 비회원이면 Firestore에 신규 비회원 정보 실시간 삽입
                    const newGuestData = {
                        userId: guestId,
                        password: "", // 비회원은 비밀번호 없음
                        name: name,
                        phoneNumber: phone,
                        role: 'guest', // 비회원 등급 분할 부여
                        joinedDate: new Date().toISOString().split('T')[0]
                    };
                    await setDoc(userDocRef, newGuestData);
                    finalUserData = newGuestData;
                }

                alert(`🔓 비회원(게스트) 로그인 성공! ${finalUserData.name}님 환영합니다.`);

                // 세션 스토리지에 정보 영구 매핑 후 대시보드 강제 리다이렉트
                sessionStorage.setItem("isLoggedIn", "true");
                sessionStorage.setItem("userId", finalUserData.userId);
                sessionStorage.setItem("userName", finalUserData.name);
                sessionStorage.setItem("userRole", finalUserData.role);

                window.location.href = "index.html";

            } catch (error) {
                console.error("비회원 로그인 에러:", error);
                alert(`🚨 비회원 입장 실패: ${error.message}`);
            }
        } 
        // ── 3. 정식 일반 로그인 프로세스 ──
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
                console.error("로그인 에러:", error);
                alert("로그인 도중 오류가 발생했습니다.");
            }
        }
    });
}