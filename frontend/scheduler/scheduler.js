(function () {
    const esc = value => {
        const node = document.createElement("div");
        node.textContent = String(value ?? "");
        return node.innerHTML;
    };

    let storedToken = sessionStorage.getItem("jarvis.authToken") || null;

    function authHeaders() {
        const h = { "Content-Type": "application/json" };
        if (storedToken) h["Authorization"] = "Bearer " + storedToken;
        return h;
    }

    function authFetch(url, opts) {
        return fetch(url, { ...opts, credentials: "include", headers: { ...authHeaders(), ...(opts && opts.headers || {}) } });
    }

    function timeAgo(ts) {
        if (!ts) return "never";
        const s = Math.floor((Date.now() - Date.parse(ts)) / 1000);
        if (s < 60) return s + "s ago";
        if (s < 3600) return Math.floor(s / 60) + "m ago";
        if (s < 86400) return Math.floor(s / 3600) + "h ago";
        return Math.floor(s / 86400) + "d ago";
    }

    function formatSchedule(sched) {
        const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        if (sched.frequency === "daily") {
            return "Daily at " + String(sched.hour).padStart(2, "0") + ":" + String(sched.minute).padStart(2, "0");
        }
        return "Weekly " + (days[sched.dayOfWeek] || "?") + " at " + String(sched.hour).padStart(2, "0") + ":" + String(sched.minute).padStart(2, "0");
    }

    async function loadScheduler() {
        const container = document.getElementById("dashboardRoot");
        if (!container) return;

        container.innerHTML = '<div class="command-center-loading"><div class="loading-pulse"></div><span>Loading scheduler...</span></div>';

        try {
            const [statusRes, schedulesRes, runsRes] = await Promise.all([
                authFetch("/api/agent-scheduler/status"),
                authFetch("/api/agent-scheduler/schedules"),
                authFetch("/api/agent-scheduler/runs?limit=20")
            ]);

            const statusData = statusRes.ok ? await statusRes.json() : null;
            const schedulesData = schedulesRes.ok ? await schedulesRes.json() : null;
            const runsData = runsRes.ok ? await runsRes.json() : null;

            const status = statusData?.data || {};
            const schedules = schedulesData?.data || [];
            const runs = runsData?.data || [];

            const enabledCount = schedules.filter(s => s.enabled).length;
            const totalRuns = schedules.reduce((sum, s) => sum + (s.runCount || 0), 0);

            let html = '<div class="module-shell">';

            // Hero
            html += '<section class="module-hero">';
            html += '<div>';
            html += '<div class="eyebrow">JARVIS OS / AGENT SCHEDULER</div>';
            html += '<h1>Agent Scheduler</h1>';
            html += '<p>' + enabledCount + ' of ' + schedules.length + ' schedules enabled · ' + totalRuns + ' total runs · Next tick in ~' + Math.round((status.nextTickIn || 300) / 60) + 'min</p>';
            html += '</div>';
            html += '<div class="system-status"><span class="status-dot"></span><span>' + enabledCount + ' ACTIVE</span></div>';
            html += '</section>';

            // Schedules grid
            html += '<div class="section-label" style="margin-bottom:12px">SCHEDULES</div>';
            html += '<div class="scheduler-grid">';

            for (const sched of schedules) {
                const statusClass = sched.enabled ? (sched.lastRunStatus === "error" ? "error" : "active") : "disabled";
                const statusLabel = sched.enabled ? (sched.lastRunStatus === "error" ? "ERROR" : "ACTIVE") : "DISABLED";

                html += '<div class="scheduler-card">';
                html += '<div class="scheduler-card-header">';
                html += '<strong>' + esc(sched.name) + '</strong>';
                html += '<span class="scheduler-status-badge ' + statusClass + '">' + statusLabel + '</span>';
                html += '</div>';
                html += '<div class="scheduler-card-detail">' + esc(formatSchedule(sched)) + '</div>';
                html += '<div class="scheduler-card-detail">Agent: ' + esc(sched.agentId) + (sched.ventureId ? ' · AVO: ' + esc(sched.ventureId) : '') + '</div>';
                html += '<div class="scheduler-card-detail">Action: ' + esc(sched.action || "—") + '</div>';
                html += '<div class="scheduler-card-detail">Runs: ' + (sched.runCount || 0) + ' · Last: ' + timeAgo(sched.lastRunAt);
                if (sched.lastRunError) html += ' · <span style="color:#ef4444">' + esc(sched.lastRunError.substring(0, 60)) + '</span>';
                html += '</div>';
                html += '<div class="scheduler-card-actions">';
                html += '<button class="scheduler-btn" onclick="schedulerToggle(\'' + esc(sched.id) + '\',' + (!sched.enabled) + ')">' + (sched.enabled ? "Disable" : "Enable") + '</button>';
                html += '<button class="scheduler-btn run-now" onclick="schedulerRun(\'' + esc(sched.id) + '\')" ' + (!sched.enabled ? 'disabled' : '') + '>Run Now</button>';
                html += '</div>';
                html += '</div>';
            }

            html += '</div>';

            // Run history
            if (runs.length) {
                html += '<div class="section-label" style="margin:24px 0 12px">RECENT RUNS</div>';
                html += '<div class="scheduler-runs">';

                for (const run of runs.slice(0, 15)) {
                    const runColor = run.outcome === "completed" ? "var(--green)" : run.outcome === "error" ? "#ef4444" : "var(--yellow)";
                    html += '<div class="scheduler-run-item">';
                    html += '<div class="scheduler-run-dot" style="background:' + runColor + '"></div>';
                    html += '<div class="scheduler-run-text"><strong>' + esc(run.scheduleName || run.scheduleId) + '</strong>';
                    html += ' — ' + esc(run.outcome || "unknown");
                    if (run.findingsCount > 0) html += ' · ' + run.findingsCount + ' findings';
                    if (run.error) html += ' · <span style="color:#ef4444">' + esc(run.error.substring(0, 80)) + '</span>';
                    html += '</div>';
                    html += '<div class="scheduler-run-time">' + timeAgo(run.runAt) + '</div>';
                    html += '</div>';
                }

                html += '</div>';
            }

            html += '</div>';

            container.innerHTML = html;

        } catch (err) {
            container.innerHTML = '<div class="command-center-loading"><div class="eyebrow">ERROR</div><h2>Failed to load scheduler</h2><p>' + esc(err.message) + '</p></div>';
        }
    }

    window.schedulerToggle = async function (scheduleId, enabled) {
        try {
            await authFetch("/api/agent-scheduler/schedules/" + scheduleId + "/toggle", {
                method: "POST",
                body: JSON.stringify({ enabled })
            });
            loadScheduler();
        } catch (e) {
            alert("Toggle failed: " + e.message);
        }
    };

    window.schedulerRun = async function (scheduleId) {
        try {
            const res = await authFetch("/api/agent-scheduler/schedules/" + scheduleId + "/run", { method: "POST" });
            const data = await res.json();
            if (data.ok) {
                alert("Schedule triggered: " + (data.data?.outcome || "started"));
            } else {
                alert("Error: " + (data.error || "unknown"));
            }
            loadScheduler();
        } catch (e) {
            alert("Run failed: " + e.message);
        }
    };

    window.loadScheduler = loadScheduler;
})();
