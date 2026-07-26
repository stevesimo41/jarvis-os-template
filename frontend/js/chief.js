/* =============================================
   JARVIS OS TEMPLATE — CHIEF OF STAFF
   Copied from production (simplified)
   ============================================= */

function chiefEscape(value) {
    return String(value ?? "").replace(/[&<>'"]/g, function (character) {
        return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[character]);
    });
}

function chiefList(items, renderer, emptyMessage) {
    return items.length ? items.map(renderer).join("") : '<div class="chief-empty">' + chiefEscape(emptyMessage) + '</div>';
}

function chiefAuthHeaders() {
    var headers = { "Content-Type": "application/json" };
    var token = sessionStorage.getItem("jarvis.authToken");
    if (token) headers["Authorization"] = "Bearer " + token;
    return headers;
}

function chiefFetch(url, opts) {
    opts = opts || {};
    return fetch(url, Object.assign({}, opts, {
        credentials: "include",
        headers: Object.assign({}, chiefAuthHeaders(), opts.headers || {})
    }));
}

async function chiefAutoLogin() {
    var token = sessionStorage.getItem("jarvis.authToken");
    if (token) return true;
    try {
        var res = await fetch("/api/auth/auto-login", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ deviceName: "JARVIS auto" })
        });
        if (res.ok) {
            var data = await res.json();
            if (data?.data?.token) {
                sessionStorage.setItem("jarvis.authToken", data.data.token);
                return true;
            }
        }
    } catch (e) {}
    return false;
}

async function runChiefReview() {
    var button = document.getElementById("chiefRunReview");
    if (button) { button.disabled = true; button.textContent = "REVIEWING\u2026"; }
    try {
        var response = await chiefFetch("/api/chief-of-staff/operations/runs", {
            method: "POST",
            body: JSON.stringify({ confirmation: "RUN STAFF REVIEW" })
        });
        var payload = await response.json().catch(function () { return {}; });
        var errorMessage = typeof payload.error === "object" ? payload.error?.message : payload.error;
        if (!response.ok) throw new Error(errorMessage || "Review returned HTTP " + response.status);
        await loadChiefOfStaff();
    } catch (error) {
        var isAuthError = error.message?.includes("token is required") || error.message?.includes("Authentication") || error.message === "Authentication required";
        window.alert(isAuthError
            ? "Sign in as an operator in Settings, then run the staff review again."
            : error.message);
        if (button) { button.disabled = false; button.textContent = "RUN STAFF REVIEW"; }
    }
}

async function loadChiefOfStaff() {
    var workspace = document.getElementById("conversation");
    if (!workspace) return;
    await chiefAutoLogin();
    workspace.innerHTML = '<div class="module-shell chief-center"><div class="module-loading"><div class="loading-pulse"></div><span>Preparing the staff overview\u2026</span></div></div>';
    try {
        var response = await chiefFetch("/api/chief-of-staff");
        if (!response.ok) throw new Error("Chief of Staff returned HTTP " + response.status);
        var data = await response.json();
        var oversight = data.oversight;
        if (!oversight) {
            var operationsResponse = await chiefFetch("/api/chief-of-staff/operations");
            var contentType = operationsResponse.headers.get("content-type") || "";
            if (!operationsResponse.ok || !contentType.includes("application/json")) {
                throw new Error("The JARVIS backend is still running the previous release. Restart it, then refresh this page.");
            }
            var operationsPayload = await operationsResponse.json();
            oversight = operationsPayload.data;
        }
        if (!oversight?.metrics || !Array.isArray(oversight.roster)) {
            throw new Error("The JARVIS backend is still running the previous release. Restart it, then refresh this page.");
        }
        var metrics = oversight.metrics;
        workspace.innerHTML =
            '<div class="module-shell chief-center">' +
                '<div class="module-hero chief-hero">' +
                    '<div><div class="eyebrow">CHIEF OF STAFF \u00b7 VERSION ' + chiefEscape(oversight.agent.version) + '</div><h1>Operational Oversight</h1><p>One coordinated view of priorities, agent health, blockers, approvals, and handoffs.</p></div>' +
                    '<div class="chief-actions"><div class="system-status"><span class="status-dot"></span> OPERATIONAL</div><button id="chiefRunReview" class="chief-run" onclick="runChiefReview()">RUN STAFF REVIEW</button></div>' +
                '</div>' +
                '<div class="chief-boundary"><strong>Coordination layer:</strong> specialist agents own execution. The Chief of Staff cannot override you, bypass policy or approvals, contact anyone, run in the background, spend money, or access financial accounts.</div>' +
                '<div class="chief-metrics">' +
                    [["Agents overseen", metrics.agentsOverseen], ["Operational", metrics.operationalAgents], ["Paused", metrics.pausedAgents], ["Blocked", metrics.blockedAgents], ["Approvals", metrics.pendingApprovals]].map(function (pair) {
                        return '<div class="chief-metric"><span>' + chiefEscape(pair[0]) + '</span><strong>' + chiefEscape(pair[1]) + '</strong></div>';
                    }).join("") +
                '</div>' +
                '<div class="module-grid chief-grid">' +
                    '<section class="module-card full"><div class="card-label">VISION & ROADMAP</div><h2>Where we\'re going</h2><div class="chief-stack">' +
                        (oversight.roster ? oversight.roster.filter(function (r) { return r.status.includes("paused") || r.status.includes("blocked"); }).map(function (r) {
                            return '<article class="chief-item"><span class="chief-rank" style="background:rgba(255,190,65,.15);color:#ffd980;">!</span><div><strong>' + chiefEscape(r.name) + '</strong><p>' + chiefEscape(r.blocker || "No blocker") + '</p><small>Status: ' + chiefEscape(r.status.replace(/-/g, " ")) + '</small></div></article>';
                        }).join("") : "") +
                    '</div></section>' +
                    '<section class="module-card full"><div class="card-label">EXECUTIVE PRIORITIES</div><h2>What matters now</h2><div class="chief-stack">' + chiefList(oversight.priorities, function (item) {
                        return '<article class="chief-item"><span class="chief-rank">' + chiefEscape(item.rank) + '</span><div><strong>' + chiefEscape(item.action) + '</strong><p>' + chiefEscape(item.reason) + '</p><small>' + chiefEscape(item.owner) + '</small></div></article>';
                    }, "No priorities recorded") + '</div></section>' +
                    '<section class="module-card full"><div class="card-label">AGENT OVERSIGHT</div><h2>Specialist network</h2><div class="chief-roster">' + chiefList(oversight.roster, function (item) {
                        return '<article class="chief-agent"><div><strong>' + chiefEscape(item.name) + '</strong><span class="chief-status ' + chiefEscape(item.status) + '">' + chiefEscape(item.status.replace(/-/g, " ")) + '</span></div><p>' + chiefEscape(item.responsibility) + '</p><small>' + chiefEscape(item.work) + '</small>' + (item.blocker ? '<div class="chief-blocker">' + chiefEscape(item.blocker) + '</div>' : "") + (item.escalations && item.escalations.length ? '<div class="chief-escalations">' + item.escalations.map(function (e) {
                            return '<div class="chief-escalation ' + chiefEscape(e.severity) + '"><span class="chief-escalation-type">' + chiefEscape(e.type) + '</span> ' + chiefEscape(e.message) + '<small>' + chiefEscape(new Date(e.raisedAt).toLocaleString()) + '</small></div>';
                        }).join("") + '</div>' : "") + '</article>';
                    }, "No specialist agents found") + '</div></section>' +
                    '<section class="module-card full"><div class="card-label">AGENT ESCALATIONS</div><h2>Stuck agents, blockers, and clarifications needed</h2><div class="chief-stack">' + (oversight.escalations && oversight.escalations.active > 0 ? oversight.roster.filter(function (r) { return r.escalations && r.escalations.length > 0; }).map(function (r) {
                        return r.escalations.map(function (e) {
                            return '<article class="chief-escalation-card ' + chiefEscape(e.severity) + '"><div class="chief-escalation-header"><strong>' + chiefEscape(r.name) + '</strong><span class="chief-escalation-badge ' + chiefEscape(e.severity) + '">' + chiefEscape(e.type) + '</span></div><p>' + chiefEscape(e.message) + '</p><small>Raised: ' + chiefEscape(new Date(e.raisedAt).toLocaleString()) + '</small></article>';
                        }).join("");
                    }).join("") : '<div class="chief-empty">No active escalations \u2014 all agents proceeding within policy.</div>') + '</div></section>' +
                    '<section class="module-card"><div class="card-label">ATTENTION</div><h2>Alerts & decisions</h2><div class="chief-stack">' + chiefList(oversight.alerts, function (item) {
                        return '<article class="chief-alert"><strong>' + chiefEscape(item.title) + '</strong><p>' + chiefEscape(item.ownerAction) + '</p></article>';
                    }, "No active alerts") + '</div></section>' +
                    '<section class="module-card"><div class="card-label">HANDOFFS</div><h2>Coordination instructions</h2><div class="chief-stack">' + chiefList(oversight.handoffs, function (item) {
                        return '<article class="chief-handoff"><strong>' + chiefEscape(item.to.replace(/-/g, " ")) + '</strong><p>' + chiefEscape(item.instruction) + '</p></article>';
                    }, "No handoffs prepared") + '</div></section>' +
                    '<section class="module-card full"><div class="card-label">STAFF REVIEW HISTORY</div><h2>Auditable, on-demand reviews</h2><div class="chief-stack">' + chiefList(oversight.recentRuns.slice(0, 5), function (item) {
                        return '<article class="chief-run-row"><strong>' + chiefEscape(new Date(item.runAt).toLocaleString()) + '</strong><span>' + chiefEscape(item.agentsReviewed) + ' agents \u00b7 ' + chiefEscape(item.alertsPrepared) + ' alerts \u00b7 0 external actions \u00b7 $0 spend</span></article>';
                    }, "No staff review has been run yet. Use Run Staff Review after signing in as an operator.") + '</div></section>' +
                '</div>' +
            '</div>';
    } catch (error) {
        workspace.innerHTML = '<div class="module-shell chief-center"><div class="module-error"><div class="eyebrow">CHIEF OF STAFF ERROR</div><h2>Unable to load operations</h2><p>' + chiefEscape(error.message) + '</p><button onclick="loadChiefOfStaff()">Retry</button></div></div>';
    }
}

window.loadChiefOfStaff = loadChiefOfStaff;
window.runChiefReview = runChiefReview;
