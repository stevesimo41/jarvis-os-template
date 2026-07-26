/* =============================================
   JARVIS OS TEMPLATE — AUTH MODULE
   Extracted from agentHub.js production auth flow
   ============================================= */

(function () {
    "use strict";

    let cachedIdentity = null;
    let storedToken = sessionStorage.getItem("jarvis.authToken") || null;

    function authHeaders() {
        const headers = { "Content-Type": "application/json" };
        if (storedToken) headers["Authorization"] = "Bearer " + storedToken;
        return headers;
    }

    function authFetch(url, opts = {}) {
        return fetch(url, {
            ...opts,
            credentials: "include",
            headers: { ...authHeaders(), ...opts.headers }
        });
    }

    async function checkSession() {
        try {
            const res = await authFetch("/api/auth/me");
            if (res.ok) {
                const data = await res.json();
                cachedIdentity = data?.data?.identity || null;
                return cachedIdentity;
            }
        } catch (e) { /* no session */ }
        cachedIdentity = null;
        return null;
    }

    async function autoLogin() {
        try {
            const res = await fetch("/api/auth/auto-login", {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ deviceName: "JARVIS auto" })
            });
            if (res.ok) {
                const data = await res.json();
                const token = data?.data?.token;
                if (token) {
                    storedToken = token;
                    sessionStorage.setItem("jarvis.authToken", token);
                    cachedIdentity = data?.data?.identity || null;
                    return cachedIdentity;
                }
            }
        } catch (e) { /* auto-login failed */ }
        return null;
    }

    async function createSession(token) {
        const res = await authFetch("/api/auth/session", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
            body: JSON.stringify({ deviceName: "Agent Hub" })
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error?.message || err.error || "Invalid token");
        }
        const data = await res.json();
        storedToken = token;
        sessionStorage.setItem("jarvis.authToken", token);
        cachedIdentity = data?.data?.identity || null;
        return cachedIdentity;
    }

    async function ensureAuth() {
        if (cachedIdentity) return true;
        let session = await checkSession();
        if (!session) session = await autoLogin();
        return !!session;
    }

    function logout() {
        storedToken = null;
        sessionStorage.removeItem("jarvis.authToken");
        cachedIdentity = null;
    }

    window.JarvisAuth = {
        authFetch,
        checkSession,
        autoLogin,
        createSession,
        ensureAuth,
        logout,
        authHeaders
    };
})();
