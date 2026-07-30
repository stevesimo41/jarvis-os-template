(function () {
    const escapeHtml = value => { const node = document.createElement("div"); node.textContent = String(value ?? ""); return node.innerHTML; };
    const tools = [
        ["activity", "Activity & Context", "Brain activity stream and shared context"],
        ["memory", "Memory", "Saved context and knowledge"],
        ["releases", "Development & Releases", "Roadmap, validation, and release history"],
        ["mobile", "Mobile Access", "PWA, sessions, and secure access status"],
        ["voice", "Voice & iPhone", "Voice controls and Apple integration status"],
        ["operations", "Autonomy Control", "Policies, schedules, and emergency controls"],
        ["readiness", "Readiness & Pilot", "Production gates and revenue pilot evidence"]
    ];
    async function loadSettings() {
        const workspace = document.getElementById("conversation");
                    workspace.innerHTML = `<section class="settings-center"><article class="settings-panel">Auditing JARVIS data sources...</article></section>`;
        try {
            const authToken = sessionStorage.getItem("jarvis.authToken");
            const headers = { "Content-Type": "application/json" };
            if (authToken) headers["Authorization"] = `Bearer ${authToken}`;
            const response = await fetch("/api/system-inventory", { headers }); const payload = await response.json();
            if (!response.ok || !payload.ok) throw new Error(payload.error || "Inventory unavailable");
            const data = payload.data;
            workspace.innerHTML = `<section class="settings-center">
                <header><div><div class="eyebrow">JARVIS OS / SETTINGS</div><h1>Settings & System Tools</h1><p>Secondary workspaces and an honest inventory of where each screen gets its information.</p></div><span>${escapeHtml(data.conversationProvider)} conversation</span></header>
                <div class="settings-tools">${tools.map(([id, name, detail]) => `<button type="button" data-module="${id}"><strong>${name}</strong><span>${detail}</span></button>`).join("")}</div>
                <article class="settings-panel"><div class="eyebrow">CURRENT CONNECTIONS</div><div class="settings-connections"><p><strong>Conversation provider</strong><span>${escapeHtml(data.conversationProvider)}</span></p><p><strong>Google Sheets</strong><span>${data.googleSheetsConfigured ? "CONFIGURED" : "NOT CONFIGURED"}</span></p><p><strong>Audit refreshed</strong><span>${escapeHtml(data.auditedAt)}</span></p></div></article>
                <article class="settings-panel"><div class="eyebrow">DATA SOURCE AUDIT</div><div class="source-audit">${data.modules.map(item => `<div class="source-row"><span class="source-badge ${escapeHtml(item.classification)}">${escapeHtml(item.classification)}</span><div><strong>${escapeHtml(item.name)}</strong><p>${escapeHtml(item.source)}</p><small>${escapeHtml(item.note)}</small></div></div>`).join("")}</div></article>
                <article class="settings-panel"><div class="eyebrow">CLASSIFICATION GUIDE</div><div class="source-legend">${Object.entries(data.legend).map(([key, value]) => `<p><strong>${escapeHtml(key)}</strong><span>${escapeHtml(value)}</span></p>`).join("")}</div></article>
                <article class="settings-panel"><div class="eyebrow">SESSION</div><div class="source-legend">
                    <p><strong>Identity</strong><span>${sessionStorage.getItem("jarvis.authToken") ? "Authenticated (auto-login)" : "Not authenticated"}</span></p>
                    <p><button onclick="sessionStorage.removeItem('jarvis.authToken'); location.reload();" style="background:#dc2626;color:white;border:none;padding:8px 16px;border-radius:6px;cursor:pointer;margin-top:8px;">Sign Out</button></p>
                </div></article>
            </section>`;
            workspace.querySelectorAll("[data-module]").forEach(button => button.addEventListener("click", () => window.loadModule(button.dataset.module)));
        } catch (error) { workspace.innerHTML = `<section class="settings-center"><article class="settings-panel">${escapeHtml(error.message)}</article></section>`; }
    }
    window.loadSettings = loadSettings;
}());
