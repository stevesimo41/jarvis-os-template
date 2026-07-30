console.log("Layout module loaded");

let intelligenceRefreshInterval = null;

function timeAgo(timestamp) {
    const seconds = Math.floor((Date.now() - Date.parse(timestamp)) / 1000);
    if (seconds < 60) return "just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
}

function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = String(text ?? "");
    return div.innerHTML;
}

async function loadIntelligencePanel() {
    const pendingApprovals = document.getElementById("pendingApprovals");
    const todaysPriorities = document.getElementById("todaysPriorities");
    const agentNetwork = document.getElementById("agentNetwork");
    const systemHealth = document.getElementById("systemHealth");
    const recentActivity = document.getElementById("recentActivity");

    try {
        const authToken = sessionStorage.getItem("jarvis.authToken") || "";
        const authHeaders = authToken ? { "Authorization": "Bearer " + authToken } : {};
        const fetchOpts = { credentials: "include", headers: authHeaders };

        const [hubResponse, briefResponse, healthResponse, activityResponse] = await Promise.all([
            fetch("/api/agent-hub", fetchOpts).catch(() => null),
            fetch("/api/jarvis/brief", fetchOpts).catch(() => null),
            fetch("/api/health", fetchOpts).catch(() => null),
            fetch("/api/brain/activity?limit=8", fetchOpts).catch(() => null)
        ]);

        const hubData = hubResponse?.ok ? await hubResponse.json() : null;
        const briefData = briefResponse?.ok ? await briefResponse.json() : null;
        const healthData = healthResponse?.ok ? await healthResponse.json() : null;
        let activities = [];
        if (activityResponse?.ok) {
            const activityData = await activityResponse.json();
            activities = activityData.data?.events || activityData.data || [];
        }

        const brief = briefData?.brief || briefData?.data || {};
        const priority = brief.priority || {};
        const executionPlan = brief.executionPlan || [];
        const hubItems = hubData?.data?.items || [];
        const pendingItems = hubItems.filter(item => item.status === "pending");

        if (pendingApprovals) {
            if (pendingItems.length) {
                pendingApprovals.innerHTML = pendingItems.slice(0, 5).map(item => {
                    const isMPO = item.action === "market_pulse_opportunity";
                    const target = isMPO ? `loadModule('agent-hub','venture')` : `loadModule('agent-hub')`;
                    return `
                    <div class="activity-item" style="cursor:pointer" onclick="${target}">
                        <span class="activity-dot requested"></span>
                        <span class="activity-text">${escapeHtml(item.title || item.action)}</span>
                    </div>
                `}).join("") + (pendingItems.length > 5 ? `<div class="activity-item"><span class="activity-dot"></span><strong>+${pendingItems.length - 5} more</strong></div>` : "");
            } else {
                pendingApprovals.innerHTML = `<div class="activity-item"><span class="activity-dot" style="background:#22c55e"></span>All clear — nothing pending</div>`;
            }
        }

        if (todaysPriorities) {
            if (executionPlan.length) {
                todaysPriorities.innerHTML = executionPlan.slice(0, 5).map((item, i) => `
                    <div class="activity-item">
                        <span class="activity-dot prepared"></span>
                        <span class="activity-text">${i + 1}. ${escapeHtml(typeof item === "string" ? item : item.text || item.name || item)}</span>
                    </div>
                `).join("");
            } else if (priority.name) {
                todaysPriorities.innerHTML = `
                    <div class="activity-item">
                        <span class="activity-dot prepared"></span>
                        <span class="activity-text"><strong>${escapeHtml(priority.name)}</strong></span>
                    </div>
                    <div class="activity-item">
                        <span class="activity-dot"></span>
                        <span class="activity-text">${escapeHtml(priority.nextMilestone || "Continue current mission")}</span>
                    </div>
                `;
            } else {
                todaysPriorities.innerHTML = `<div class="activity-item"><span class="activity-dot"></span>Command Center has your priorities</div>`;
            }
        }

        if (agentNetwork) {
            const agents = hubData?.data?.registry || [];
            const operational = agents.filter(a => a.operational);
            const planned = agents.filter(a => !a.operational);
            if (agents.length) {
                agentNetwork.innerHTML = operational.map(a => `
                    <div class="activity-item">
                        <span class="activity-dot" style="background:#22c55e"></span>
                        <span class="activity-text">${escapeHtml(a.name || a.id)} <small style="color:#64748b">· ${escapeHtml(a.source || "service")}</small></span>
                    </div>
                `).join("") + planned.map(a => `
                    <div class="activity-item">
                        <span class="activity-dot" style="background:#64748b"></span>
                        <span class="activity-text" style="color:#64748b">${escapeHtml(a.name || a.id)} <small>· ${escapeHtml(a.status || "planned")}</small></span>
                    </div>
                `).join("");
            } else {
                agentNetwork.innerHTML = `<div class="activity-item"><span class="activity-dot"></span>No agents registered</div>`;
            }
        }

        if (systemHealth) {
            const isHealthy = healthData?.status === "ok" || healthData?.ok === true;
            const agents = hubData?.data?.registry || [];
            const operationalCount = agents.filter(a => a.operational).length;
            const totalAgents = agents.length;
            const pendingCount = pendingItems.length;
            const registeredCount = agents.filter(a => !a.operational).length;

            systemHealth.innerHTML = `
                <div class="activity-item">
                    <span class="activity-dot" style="background:${isHealthy ? "#22c55e" : "#ef4444"}"></span>
                    Backend: ${isHealthy ? "Connected" : "Issue detected"}
                </div>
                <div class="activity-item">
                    <span class="activity-dot ${operationalCount > 0 ? "" : "issue"}"></span>
                    Agents: ${operationalCount} operational · ${registeredCount} REGISTERED
                </div>
                <div class="activity-item">
                    <span class="activity-dot ${pendingCount > 0 ? "requested" : ""}"></span>
                    Approvals: ${pendingCount} pending
                </div>
            `;
        }

        if (recentActivity) {
            if (activities.length) {
                recentActivity.innerHTML = activities.slice(0, 4).map(item => `
                    <div class="activity-item">
                        <span class="activity-dot ${item.phase || ""}"></span>
                        <span class="activity-text">${escapeHtml(item.summary || "Activity")}</span>
                        <span class="activity-time">${timeAgo(item.timestamp)}</span>
                    </div>
                `).join("");
            } else {
                recentActivity.innerHTML = `<div class="activity-item"><span class="activity-dot"></span>JARVIS online and ready</div>`;
            }
        }

    } catch (error) {
        console.error("Intelligence panel failed to load:", error);
        if (pendingApprovals) pendingApprovals.innerHTML = `<div class="empty-state">Unavailable</div>`;
        if (todaysPriorities) todaysPriorities.innerHTML = `<div class="empty-state">Unavailable</div>`;
        if (systemHealth) systemHealth.innerHTML = `<div class="empty-state">Unavailable</div>`;
        if (recentActivity) recentActivity.innerHTML = `<div class="empty-state">Unavailable</div>`;
    }
}

function startAutoRefresh() {
    stopAutoRefresh();
    intelligenceRefreshInterval = setInterval(loadIntelligencePanel, 30000);
}

function stopAutoRefresh() {
    if (intelligenceRefreshInterval) {
        clearInterval(intelligenceRefreshInterval);
        intelligenceRefreshInterval = null;
    }
}

window.loadIntelligencePanel = loadIntelligencePanel;

window.addEventListener("DOMContentLoaded", () => {
    setTimeout(() => {
        loadIntelligencePanel();
        startAutoRefresh();
    }, 200);
});
