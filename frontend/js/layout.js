/* =============================================
   JARVIS OS TEMPLATE — LAYOUT MODULE
   Intelligence panel auto-loader
   ============================================= */

console.log("Layout module loaded");

var intelligenceRefreshInterval = null;

function timeAgo(timestamp) {
    var seconds = Math.floor((Date.now() - Date.parse(timestamp)) / 1000);
    if (seconds < 60) return "just now";
    if (seconds < 3600) return Math.floor(seconds / 60) + "m ago";
    if (seconds < 86400) return Math.floor(seconds / 3600) + "h ago";
    return Math.floor(seconds / 86400) + "d ago";
}

function escapeHtml(text) {
    var div = document.createElement("div");
    div.textContent = String(text ?? "");
    return div.innerHTML;
}

async function loadIntelligencePanel() {
    var pendingApprovals = document.getElementById("pendingApprovals");
    var todaysPriorities = document.getElementById("todaysPriorities");
    var agentNetwork = document.getElementById("agentNetwork");
    var systemHealth = document.getElementById("systemHealth");
    var recentActivity = document.getElementById("recentActivity");

    try {
        var authToken = sessionStorage.getItem("jarvis.authToken") || "";
        var authHeaders = authToken ? { "Authorization": "Bearer " + authToken } : {};
        var fetchOpts = { credentials: "include", headers: authHeaders };

        var results = await Promise.all([
            fetch("/api/agent-hub", fetchOpts).catch(function () { return null; }),
            fetch("/api/jarvis/brief", fetchOpts).catch(function () { return null; }),
            fetch("/api/health", fetchOpts).catch(function () { return null; }),
            fetch("/api/brain/activity?limit=8", fetchOpts).catch(function () { return null; })
        ]);

        var hubResponse = results[0];
        var briefResponse = results[1];
        var healthResponse = results[2];
        var activityResponse = results[3];

        var hubData = hubResponse && hubResponse.ok ? await hubResponse.json() : null;
        var briefData = briefResponse && briefResponse.ok ? await briefResponse.json() : null;
        var healthData = healthResponse && healthResponse.ok ? await healthResponse.json() : null;
        var activities = [];
        if (activityResponse && activityResponse.ok) {
            var activityData = await activityResponse.json();
            activities = activityData.data?.events || activityData.data || [];
        }

        var brief = briefData?.brief || briefData?.data || {};
        var priority = brief.priority || {};
        var executionPlan = brief.executionPlan || [];
        var hubItems = hubData?.data?.items || [];
        var pendingItems = hubItems.filter(function (item) { return item.status === "pending"; });

        if (pendingApprovals) {
            if (pendingItems.length) {
                pendingApprovals.innerHTML = pendingItems.slice(0, 5).map(function (item) {
                    return '<div class="activity-item" style="cursor:pointer" onclick="loadModule(\'agent-hub\')"><span class="activity-dot requested"></span><span class="activity-text">' + escapeHtml(item.title || item.action) + '</span></div>';
                }).join("") + (pendingItems.length > 5 ? '<div class="activity-item"><span class="activity-dot"></span><strong>+' + (pendingItems.length - 5) + ' more</strong></div>' : "");
            } else {
                pendingApprovals.innerHTML = '<div class="activity-item"><span class="activity-dot" style="background:#22c55e"></span>All clear \u2014 nothing pending</div>';
            }
        }

        if (todaysPriorities) {
            if (executionPlan.length) {
                todaysPriorities.innerHTML = executionPlan.slice(0, 5).map(function (item, i) {
                    var text = typeof item === "string" ? item : item.text || item.name || item;
                    return '<div class="activity-item"><span class="activity-dot prepared"></span><span class="activity-text">' + (i + 1) + '. ' + escapeHtml(text) + '</span></div>';
                }).join("");
            } else if (priority.name) {
                todaysPriorities.innerHTML = '<div class="activity-item"><span class="activity-dot prepared"></span><span class="activity-text"><strong>' + escapeHtml(priority.name) + '</strong></span></div><div class="activity-item"><span class="activity-dot"></span><span class="activity-text">' + escapeHtml(priority.nextMilestone || "Continue current mission") + '</span></div>';
            } else {
                todaysPriorities.innerHTML = '<div class="activity-item"><span class="activity-dot"></span>Command Center has your priorities</div>';
            }
        }

        if (agentNetwork) {
            var agents = hubData?.data?.registry || [];
            var operational = agents.filter(function (a) { return a.operational; });
            var planned = agents.filter(function (a) { return !a.operational; });
            if (agents.length) {
                agentNetwork.innerHTML = operational.map(function (a) {
                    return '<div class="activity-item"><span class="activity-dot" style="background:#22c55e"></span><span class="activity-text">' + escapeHtml(a.name || a.id) + ' <small style="color:#64748b">\u00b7 ' + escapeHtml(a.source || "service") + '</small></span></div>';
                }).join("") + planned.map(function (a) {
                    return '<div class="activity-item"><span class="activity-dot" style="background:#64748b"></span><span class="activity-text" style="color:#64748b">' + escapeHtml(a.name || a.id) + ' <small>\u00b7 ' + escapeHtml(a.status || "planned") + '</small></span></div>';
                }).join("");
            } else {
                agentNetwork.innerHTML = '<div class="activity-item"><span class="activity-dot"></span>No agents registered</div>';
            }
        }

        if (systemHealth) {
            var isHealthy = healthData?.status === "ok" || healthData?.ok === true;
            var allAgents = hubData?.data?.registry || [];
            var operationalCount = allAgents.filter(function (a) { return a.operational; }).length;
            var registeredCount = allAgents.filter(function (a) { return !a.operational; }).length;
            var pendingCount = pendingItems.length;

            systemHealth.innerHTML = '<div class="activity-item"><span class="activity-dot" style="background:' + (isHealthy ? "#22c55e" : "#ef4444") + '"></span>Backend: ' + (isHealthy ? "Connected" : "Issue detected") + '</div><div class="activity-item"><span class="activity-dot"></span>Agents: ' + operationalCount + ' operational \u00b7 ' + registeredCount + ' REGISTERED</div><div class="activity-item"><span class="activity-dot ' + (pendingCount > 0 ? "requested" : "") + '"></span>Approvals: ' + pendingCount + ' pending</div>';
        }

        if (recentActivity) {
            if (activities.length) {
                recentActivity.innerHTML = activities.slice(0, 4).map(function (item) {
                    return '<div class="activity-item"><span class="activity-dot ' + (item.phase || "") + '"></span><span class="activity-text">' + escapeHtml(item.summary || "Activity") + '</span><span class="activity-time">' + timeAgo(item.timestamp) + '</span></div>';
                }).join("");
            } else {
                recentActivity.innerHTML = '<div class="activity-item"><span class="activity-dot"></span>JARVIS online and ready</div>';
            }
        }

    } catch (error) {
        console.error("Intelligence panel failed to load:", error);
        if (pendingApprovals) pendingApprovals.innerHTML = '<div class="empty-state">Unavailable</div>';
        if (todaysPriorities) todaysPriorities.innerHTML = '<div class="empty-state">Unavailable</div>';
        if (systemHealth) systemHealth.innerHTML = '<div class="empty-state">Unavailable</div>';
        if (recentActivity) recentActivity.innerHTML = '<div class="empty-state">Unavailable</div>';
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

window.addEventListener("DOMContentLoaded", function () {
    setTimeout(function () {
        loadIntelligencePanel();
        startAutoRefresh();
    }, 200);
});
