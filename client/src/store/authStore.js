import { create } from 'zustand';
import { jwtDecode } from 'jwt-decode';

// 토큰에서 admin 정보 복구 시도 (PIN 제외 — PIN은 로그인 응답에만 존재)
function restoreAdmin(token) {
    if (!token) return null;
    try {
        const decoded = jwtDecode(token);
        // 만료 확인
        if (decoded.exp && Date.now() / 1000 > decoded.exp) return null;
        return { id: decoded.id, name: decoded.name, email: decoded.email, pinCode: null };
    } catch {
        return null;
    }
}

const storedToken = localStorage.getItem('token');
const storedPin = localStorage.getItem('pinCode');
const restoredAdmin = restoreAdmin(storedToken);
if (restoredAdmin && storedPin) restoredAdmin.pinCode = storedPin;

const useAuthStore = create((set) => ({
    admin: restoredAdmin,
    token: restoredAdmin ? storedToken : null,

    setAuth: (admin, token) => {
        localStorage.setItem('token', token);
        if (admin?.pinCode) localStorage.setItem('pinCode', admin.pinCode);
        set({ admin, token });
    },

    logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('pinCode');
        set({ admin: null, token: null });
    }
}));

export default useAuthStore;
