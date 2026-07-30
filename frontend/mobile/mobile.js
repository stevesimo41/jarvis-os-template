(function () {
    let installPrompt = null;
    window.addEventListener("beforeinstallprompt", event => { event.preventDefault(); installPrompt = event; });
    if ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("/service-worker.js"));
    async function loadMobile() {
        const workspace = document.getElementById("conversation");
        const token = sessionStorage.getItem("jarvis.authToken");
        const authHeaders = token ? {"Authorization": "Bearer " + token} : {};
        const fetchOpts = {credentials: "include", headers: authHeaders};
        const [control, sessions, readiness] = await Promise.all([fetch("/api/system-control/status", fetchOpts).then(r => r.json()), fetch("/api/auth/sessions", fetchOpts).then(async r => r.ok ? r.json() : null).catch(() => null), fetch("/api/mobile-access/readiness", fetchOpts).then(r => r.json())]);
        workspace.innerHTML = `<section class="mobile-center"><header class="mobile-hero"><div><div class="eyebrow">JARVIS OS / MOBILE</div><h1>Mobile Access</h1><p>Installable private access with device sessions and emergency control.</p></div><span>${control.data.stopped ? "STOPPED" : "OPERATIONS READY"}</span></header>
        <div class="mobile-actions"><button id="installJarvis">Install JARVIS</button><button id="notifyJarvis">Enable notifications</button></div>
        <article class="mobile-panel"><div class="eyebrow">PRIVATE PHONE READINESS · ${readiness.data.status}</div>${readiness.data.gates.map(g => `<p><strong>${g.ready ? "READY" : "BLOCKED"} · ${g.label}</strong></p>`).join("")}<p>${readiness.data.warning}</p></article>
        <article class="mobile-panel"><div class="eyebrow">DEVICE SESSIONS</div>${sessions ? sessions.data.sessions.map(s => `<p><strong>${s.deviceName}</strong><span>${s.role} · expires ${new Date(s.expiresAt).toLocaleString()}</span></p>`).join("") || "<p>No active sessions</p>" : "<p>Connect as owner to view and revoke devices.</p>"}</article>
        <article class="mobile-panel danger"><div class="eyebrow">EMERGENCY STOP</div><p>Immediately suspend governed automation. Owner authentication and exact confirmation are required.</p><button id="stopJarvis">STOP AUTOMATION</button></article>
        <p class="mobile-boundary">Remote use requires a private authenticated HTTPS gateway. Never expose the development server directly.</p></section>`;
        document.getElementById("installJarvis").onclick = async () => installPrompt ? installPrompt.prompt() : alert("Use Add to Home Screen from your browser menu.");
        document.getElementById("notifyJarvis").onclick = async () => { if ("Notification" in window) await Notification.requestPermission(); };
        document.getElementById("stopJarvis").onclick = async () => { if (!confirm("Stop governed JARVIS automation now?")) return; const token = sessionStorage.getItem("jarvis.authToken"); const headers = {"Content-Type":"application/json"}; if (token) headers["Authorization"] = "Bearer " + token; await fetch("/api/system-control/stop", {method:"POST", headers, credentials:"include", body:JSON.stringify({confirmation:"STOP",reason:"Mobile emergency stop"})}); loadMobile(); };
    }
    window.loadMobile = loadMobile;
}());
