import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, onSnapshot, doc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDn7oGNdD02WceJwIvz_zNitJx5bATD8jY",
    authDomain: "solrafc.firebaseapp.com",
    projectId: "solrafc",
    storageBucket: "solrafc.firebasestorage.app",
    messagingSenderId: "267444798176",
    appId: "1:267444798176:web:c85dcf7385aa02e5790685"
};

// 1. 보안 권한 세션 무결성 스캔
const isLoggedIn = sessionStorage.getItem("isLoggedIn");
const userId = sessionStorage.getItem("userId");
const userName = sessionStorage.getItem("userName") || "크루멤버";

if (isLoggedIn !== "true" || !userId) {
    alert("🔒 로그인이 필요한 페이지입니다. 로그인 화면으로 이동합니다.");
    window.location.href = "login.html";
}

// 최고 마스터 관리자 아이디 방어벽 가동
if (userId !== "관리자") {
    alert("🛑 접근 권한이 없습니다. 마스터 관리자 전용 영역입니다.");
    window.location.href = "index.html";
}

const userInfoElem = document.getElementById('user-info');
if (userInfoElem) userInfoElem.innerText = `👑 관리자 계정`;

document.getElementById('btn-logout')?.addEventListener('click', () => {
    sessionStorage.clear();
    alert("🔒 로그아웃 되었습니다.");
    window.location.href = "login.html";
});

// Firebase 연동 리소스 초기화
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 모달 제어 DOM 엘리먼트 정의
const modalOverlay = document.getElementById('member-modal-overlay');
const modalContent = document.getElementById('member-modal-content');
const listBody = document.getElementById('member-list-body');

const mId = document.getElementById('modal-user-id');
const mName = document.getElementById('modal-user-name');
const mPhone = document.getElementById('modal-user-phone');
const mPassword = document.getElementById('modal-user-password');
const mRole = document.getElementById('modal-user-role');

// 💥 변수 전역 스코프 안전핀 확보 (클릭한 회원의 실제 파이어베이스 문서 ID를 임시 보관)
let currentTargetDocId = "";

// 2. 👥 Firestore 유저 명부 컬렉션 실시간 로딩 엔진
function initMemberList() {
    if (!listBody) return;

    onSnapshot(collection(db, "users"), (querySnapshot) => {
        listBody.innerHTML = '';
        
        if (querySnapshot.empty) {
            listBody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #6c757d;">등록된 클럽 회원이 존재하지 않습니다.</td></tr>';
            return;
        }

        querySnapshot.forEach((userDoc) => {
            const data = userDoc.data();
            const tr = document.createElement('tr');
            
            // 회원 유형 등급 뱃지 컴포넌트 맵 가공
            let roleBadge = `<span class="role-badge member">회원</span>`;
            if (data.role === 'guest') roleBadge = `<span class="role-badge guest">비회원</span>`;
            if (data.userId === '관리자') roleBadge = `<span class="role-badge master">Master</span>`;

            // 모바일 뷰 카드 변환용 'data-label' 속성 실시간 조합 이식
            tr.innerHTML = `
                <td data-label="이름">${data.name || '미기입'}</td>
                <td data-label="아이디">${data.userId}</td>
                <td data-label="전화번호">${data.phoneNumber || '미기입'}</td>
                <td data-label="비밀번호">${data.password || '없음(게스트)'}</td>
                <td data-label="회원 분류">${roleBadge}</td>
            `;

            // 최고관리자('관리자' 아이디) 데이터 본인은 수정/삭제 대상에서 제외 처리하여 시스템 꼬임 방지
            if (data.userId !== '관리자') {
                // ✨ [버그 해결 핵심]: 클릭 이벤트 발생 시 고유 문서 ID인 userDoc.id를 명확히 넘겨줍니다.
                tr.addEventListener('click', () => openEditModal(data, userDoc.id));
            } else {
                tr.style.cursor = 'default';
                tr.title = '시스템 마스터 계정은 임의 수정할 수 없습니다.';
            }

            listBody.appendChild(tr);
        });
    }, (error) => {
        console.error("명부 바인딩 장애:", error);
    });
}

// 3. ⚙️ 모달 활성화 및 타겟 데이터 바인딩 로직
function openEditModal(userData, docId) {
    if (!modalOverlay) return;
    
    // ✨ 전역 변수에 파이어베이스의 실제 문서 ID 키값을 안전하게 격리 보관합니다.
    currentTargetDocId = docId;
    
    mId.value = userData.userId;
    mName.value = userData.name || '';
    mPhone.value = userData.phoneNumber || '';
    mPassword.value = userData.password || '';
    mRole.value = userData.role || 'member';

    modalOverlay.classList.add('show');
}

// 모달 닫기 제어 리스너
document.getElementById('btn-modal-close')?.addEventListener('click', () => modalOverlay.classList.remove('show'));
modalOverlay?.addEventListener('click', () => modalOverlay.classList.remove('show'));
modalContent?.addEventListener('click', (e) => e.stopPropagation());

// 4. ✨ 실시간 정보 수정(Update) 처리 트랜잭션 함수
document.getElementById('btn-modal-update')?.addEventListener('click', async () => {
    // ✨ undefined 버그 완전 차단: 백엔드 고유 ID가 있으면 그것을 최우선으로 지정합니다.
    const targetId = currentTargetDocId || mId.value;
    if (!targetId) {
        alert("❌ 선택된 회원의 고유 식별 주소를 찾을 수 없습니다.");
        return;
    }

    if (!mName.value.trim() || !mPhone.value.trim()) {
        alert("❌ 이름과 전화번호는 공백으로 설정할 수 없습니다.");
        return;
    }

    try {
        const userDocRef = doc(db, "users", targetId);
        await updateDoc(userDocRef, {
            name: mName.value.trim(),
            phoneNumber: mPhone.value.trim(),
            password: mPassword.value,
            role: mRole.value
        });

        alert("⚙️ 회원 정보가 성공적으로 업데이트되었습니다!");
        modalOverlay.classList.remove('show');
    } catch (err) {
        alert("정보 수정 실패: " + err.message);
    }
});

// 5. 🚨 실시간 회원 탈퇴/삭제(Delete) 처리 함수
document.getElementById('btn-modal-delete')?.addEventListener('click', async () => {
    // ✨ undefined 버그 완전 차단: 백엔드 고유 ID가 있으면 그것을 최우선으로 지정합니다.
    const targetId = currentTargetDocId || mId.value;
    if (!targetId) {
        alert("❌ 선택된 회원의 고유 식별 주소를 찾을 수 없습니다.");
        return;
    }

    const confirmCheck = confirm(`🛑 정말로 [${mName.value}] 회원을 클럽 시스템 명부에서 영구 삭제하시겠습니까?\n삭제된 데이터는 파이어베이스에서 복구할 수 없습니다.`);
    if (!confirmCheck) return;

    try {
        const userDocRef = doc(db, "users", targetId);
        await deleteDoc(userDocRef);
        alert("🗑️ 해당 유저 데이터가 안전하게 파이어베이스 명부에서 영구 삭제되었습니다.");
        modalOverlay.classList.remove('show');
    } catch (err) {
        alert("회원 제거 실패: " + err.message);
    }
});

// 전화번호 수정 필드 자동 하이픈 하이라이터 매핑
mPhone?.addEventListener('input', (e) => {
    let value = e.target.value.replace(/[^0-9]/g, '');
    let result = '';
    if (value.length < 4) result = value;
    else if (value.length < 7) result = value.substr(0, 3) + '-' + value.substr(3);
    else if (value.length < 11) result = value.substr(0, 3) + '-' + value.substr(3, 3) + '-' + value.substr(6);
    else result = value.substr(0, 3) + '-' + value.substr(3, 4) + '-' + value.substr(7);
    e.target.value = result;
});

// 이그니션 시동 가동
initMemberList();