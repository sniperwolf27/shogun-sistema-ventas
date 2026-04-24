/**
 * AUTH MODULE
 * Session management with our own JWT (no Supabase)
 */

class Auth {
    static TOKEN_KEY = 'sb_access_token';
    static USER_KEY = 'user';

    static isAuthenticated() { return !!this.getToken(); }

    static getToken() { return localStorage.getItem(this.TOKEN_KEY); }

    static getUser() {
        try { const r = localStorage.getItem(this.USER_KEY); return r ? JSON.parse(r) : null; }
        catch { return null; }
    }

    static saveSession(accessToken, user) {
        localStorage.setItem(this.TOKEN_KEY, accessToken);
        localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    }

    static clearSession() {
        localStorage.removeItem(this.TOKEN_KEY);
        localStorage.removeItem(this.USER_KEY);
    }

    static async verify() {
        const token = this.getToken();
        if (!token) return false;
        try {
            const res = await fetch(`${window.API_BASE}/verify`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (!res.ok) { this.clearSession(); return false; }
            const data = await res.json();
            if (data.success && data.user) localStorage.setItem(this.USER_KEY, JSON.stringify(data.user));
            return data.success === true;
        } catch { return false; }
    }

    static async logout() {
        try {
            const token = this.getToken();
            if (token) {
                await fetch(`${window.API_BASE}/logout`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }
                }).catch(() => {});
            }
        } catch {}
        this.clearSession();
        window.location.href = '/login';
    }

    static isAdmin() {
        const user = this.getUser();
        return user && user.rol === 'admin';
    }
}

// Auto-protect pages
document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;
    if (path === '/login' || path === '/') return;
    if (!Auth.isAuthenticated()) { window.location.href = '/login'; return; }
    Auth.verify().then(valid => { if (!valid) window.location.href = '/login'; });
});
