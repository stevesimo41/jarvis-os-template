/* =============================================
   JARVIS OS TEMPLATE — COMMAND CENTER
   Simplified dashboard for template users
   ============================================= */

console.log("Command Center module loaded");

async function loadCommandCenter() {
    if (!sessionStorage.getItem("jarvis.authToken")) {
        try {
            var r = await fetch("/api/auth/auto-login", {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ deviceName: "JARVIS auto" })
            });
            if (r.ok) {
                var d = await r.json();
                if (d?.data?.token) sessionStorage.setItem("jarvis.authToken", d.data.token);
            }
        } catch (e) {}
    }

    var container = document.getElementById("dashboardRoot");
    if (!container) {
        console.error("Command Center container not found.");
        return;
    }

    container.innerHTML = '<div class="command-center-shell"><section class="command-hero"><div class="command-hero-main"><div class="eyebrow">JARVIS OS / EXECUTIVE INTELLIGENCE</div><h1>Command Center</h1><p>Executive operating system online. Intelligence, priorities, opportunities, and execution in one operating view.</p></div><div class="command-system-status"><span class="status-dot"></span><div><strong>SYSTEM ONLINE</strong><span>Live intelligence connected</span></div></div></section><div class="command-center-loading"><div class="loading-pulse"></div><span>Synchronizing live intelligence...</span></div></div>';

    try {
        var authToken = sessionStorage.getItem("jarvis.authToken") || "";
        var authHeaders = authToken ? { "Authorization": "Bearer " + authToken } : {};
        var fetchOpts = { credentials: "include", headers: authHeaders };

        var results = await Promise.all([
            fetch("/api/command-center", fetchOpts),
            fetch("/api/jarvis/brief", fetchOpts),
            fetch("/api/agent-hub", fetchOpts)
        ]);

        var healthResponse = results[0];
        var briefResponse = results[1];
        var agentHubResponse = results[2];

        var healthData = healthResponse.ok ? await healthResponse.json() : { health: { checks: [] } };
        var briefData = briefResponse.ok ? await briefResponse.json() : { brief: {} };

        var healthChecks = healthData.health?.checks || [];
        var brief = briefData.brief || {};
        var executionPlan = brief.executionPlan || [];
        var opportunities = brief.opportunityPipeline || [];
        var priority = brief.priority || {};
        var revenue = brief.revenueOpportunity || {};
        var capital = brief.capitalOpportunity || {};
        var research = brief.researchPriority || {};
        var recommendation = brief.recommendation || {};
        var selfImprovement = brief.selfImprovement || {};
        var patterns = brief.learningInsights || {};

        container.innerHTML = '<div class="command-center-shell"><section class="command-hero"><div class="command-hero-main"><div class="eyebrow">JARVIS OS / EXECUTIVE INTELLIGENCE</div><h1>Command Center</h1><p>Executive operating system online. Intelligence, priorities, opportunities, and execution in one operating view.</p></div><div class="command-system-status"><span class="status-dot"></span><div><strong>SYSTEM ONLINE</strong><span>Live intelligence connected</span></div></div></section><section class="command-section"><div class="command-section-header"><div><div class="eyebrow">EXECUTIVE OVERVIEW</div><h2>Strategic Priorities</h2></div><span class="command-section-meta">' + (brief.timestamp ? new Date(brief.timestamp).toLocaleTimeString() : "LIVE") + '</span></div><div class="executive-priority-grid"><div class="executive-card primary"><div class="executive-card-top"><span class="card-label">PRIMARY MISSION</span><span class="priority-status active">ACTIVE</span></div><h3>' + (priority.name || "No priority available") + '</h3><div class="score-display"><strong>' + (priority.executiveScore ?? "N/A") + '</strong><span>/ 10 executive score</span></div><p>' + (priority.nextMilestone || "No milestone available") + '</p></div><div class="executive-card"><div class="executive-card-top"><span class="card-label">REVENUE ENGINE</span><span class="priority-status active">ACTIVE</span></div><h3>' + (revenue.name || "No opportunity available") + '</h3><div class="score-display"><strong>' + (revenue.ventureScore ?? "N/A") + '</strong><span>/ 10 venture score</span></div><p>' + (revenue.nextAction || "No action available") + '</p></div><div class="executive-card"><div class="executive-card-top"><span class="card-label">CAPITAL OPPORTUNITY</span><span class="priority-status identified">IDENTIFIED</span></div><h3>' + (capital.name || "No capital opportunity") + '</h3><div class="capital-value">' + (capital.potentialValue ? "$" + Number(capital.potentialValue).toLocaleString() : "N/A") + '</div><p>' + (capital.nextAction || "No action available") + '</p></div><div class="executive-card"><div class="executive-card-top"><span class="card-label">RESEARCH PRIORITY</span><span class="priority-status active">ACTIVE</span></div><h3>' + (research.name || "No research priority") + '</h3><div class="research-score"><strong>' + (research.researchScore ?? "N/A") + '</strong><span>/ 10 research score</span></div><p>Target: ' + (research.target || "No target available") + '</p></div></div></section><div class="command-main-grid"><section class="command-section"><div class="command-section-header"><div><div class="eyebrow">TODAY\'S EXECUTION</div><h2>Recommended Actions</h2></div></div><div class="execution-stack">' + (executionPlan.length ? executionPlan.map(function (item, index) {
            var name = typeof item === "string" ? item : item.name || item.title || "Action";
            var detail = typeof item === "string" ? "" : item.description || item.detail || "";
            return '<div class="execution-item"><div class="execution-index">' + String(index + 1).padStart(2, "0") + '</div><div class="execution-body"><span>EXECUTION PRIORITY</span><strong>' + escapeHtml(name) + '</strong>' + (detail ? '<small style="color:#8899aa;font-size:0.8rem;">' + escapeHtml(detail) + '</small>' : "") + '</div><div class="execution-arrow">\u2192</div></div>';
        }).join("") : '<div class="empty-state">No execution plan available.</div>') + '</div></section><section class="command-section"><div class="command-section-header"><div><div class="eyebrow">ADAPTIVE INTELLIGENCE</div><h2>JARVIS Recommendation</h2></div><span class="confidence-badge">' + (recommendation.confidence ?? "N/A") + ' / 10</span></div><div class="intelligence-panel"><div class="intelligence-icon">AI</div><div><strong>' + (recommendation.recommendation || "Maintain current strategy.") + '</strong><p>' + (recommendation.reasoning || recommendation.reason || "JARVIS is evaluating current execution patterns.") + '</p></div></div><div class="intelligence-metrics"><div><span>OUTCOMES REVIEWED</span><strong>' + (recommendation.evidence?.outcomesReviewed ?? "N/A") + '</strong></div><div><span>PATTERNS DETECTED</span><strong>' + (patterns.patterns?.length ?? "N/A") + '</strong></div><div><span>DECISIONS REVIEWED</span><strong>' + (selfImprovement.decisionsReviewed ?? "N/A") + '</strong></div></div></section></div><section class="command-section"><div class="command-section-header"><div><div class="eyebrow">SYSTEM HEALTH</div><h2>JARVIS Infrastructure</h2></div><span class="live-indicator"><span class="status-dot"></span>LIVE</span></div><div class="health-grid">' + (healthChecks.length ? healthChecks.map(function (check) {
            return '<div class="health-card"><div class="health-card-main"><span class="status-dot ' + (check.status === "healthy" ? "healthy" : "warning") + '"></span><div><strong>' + escapeHtml(check.system) + '</strong><span>Infrastructure service</span></div></div><span class="health-status ' + (check.status === "healthy" ? "healthy" : "warning") + '">' + escapeHtml(check.status) + '</span></div>';
        }).join("") : '<div class="empty-state">No health checks available.</div>') + '</div></section>' + (opportunities.length ? '<section class="command-section"><div class="command-section-header"><div><div class="eyebrow">OPPORTUNITY PIPELINE</div><h2>Highest Value Opportunities</h2></div><span class="command-section-meta">' + opportunities.length + ' identified</span></div><div class="opportunity-stack">' + opportunities.slice(0, 5).map(function (opportunity, index) {
            return '<div class="opportunity-item"><div class="opportunity-rank">' + String(index + 1).padStart(2, "0") + '</div><div class="opportunity-main"><strong>' + escapeHtml(opportunity.name || "Unnamed opportunity") + '</strong><span>' + escapeHtml(opportunity.venture || "Strategic opportunity") + '</span></div><div class="opportunity-value">' + (opportunity.potentialValue ? "$" + Number(opportunity.potentialValue).toLocaleString() : "N/A") + '</div><div class="opportunity-action">' + escapeHtml(opportunity.nextAction || opportunity.description || "No next action available.") + '</div></div>';
        }).join("") + '</div></section>' : "") + '<footer class="command-footer"><div>LAST SYNCHRONIZED<strong>' + (brief.timestamp ? new Date(brief.timestamp).toLocaleString() : "Unknown") + '</strong></div><button class="refresh-command-center" onclick="loadCommandCenter()">REFRESH INTELLIGENCE</button></footer></div>';

    } catch (error) {
        console.error("Unable to load Command Center:", error);
        container.innerHTML = '<div class="command-center-shell"><div class="command-error"><div class="eyebrow">CONNECTION ERROR</div><h2>JARVIS intelligence unavailable</h2><p>' + escapeHtml(error.message) + '</p><button onclick="loadCommandCenter()">RETRY CONNECTION</button></div></div>';
    }
}

window.loadCommandCenter = loadCommandCenter;
window.loadExecutiveBrief = loadCommandCenter;
