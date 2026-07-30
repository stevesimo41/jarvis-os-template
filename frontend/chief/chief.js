function chiefEscape(value) {
    return String(value ?? "").replace(/[&<>'"]/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[character]));
}

function chiefList(items, renderer, emptyMessage) {
    return items.length ? items.map(renderer).join("") : `<div class="chief-empty">${chiefEscape(emptyMessage)}</div>`;
}

function chiefAuthHeaders() {
    const headers = { "Content-Type": "application/json" };
    const token = sessionStorage.getItem("jarvis.authToken");
    if (token) headers["Authorization"] = `Bearer ${token}`;
    return headers;
}

function chiefFetch(url, opts = {}) {
    return fetch(url, {
        ...opts,
        credentials: "include",
        headers: { ...chiefAuthHeaders(), ...opts.headers }
    });
}

async function chiefAutoLogin() {
    const token = sessionStorage.getItem("jarvis.authToken");
    if (token) return true;
    try {
        const res = await fetch("/api/auth/auto-login", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ deviceName: "JARVIS auto" })
        });
        if (res.ok) {
            const data = await res.json();
            if (data?.data?.token) {
                sessionStorage.setItem("jarvis.authToken", data.data.token);
                return true;
            }
        }
    } catch (e) {}
    return false;
}

async function runChiefReview() {
    const button = document.getElementById("chiefRunReview");
    if (button) { button.disabled = true; button.textContent = "REVIEWING…"; }
    try {
        const response = await chiefFetch("/api/chief-of-staff/operations/runs", {
            method: "POST",
            body: JSON.stringify({ confirmation: "RUN STAFF REVIEW" })
        });
        const payload = await response.json().catch(() => ({}));
        const errorMessage = typeof payload.error === "object" ? payload.error?.message : payload.error;
        if (!response.ok) throw new Error(errorMessage || `Review returned HTTP ${response.status}`);
        await loadChiefOfStaff();
    } catch (error) {
        const isAuthError = error.message?.includes("token is required") || error.message?.includes("Authentication") || error.message === "Authentication required";
        window.alert(isAuthError
            ? "Sign in as an operator in Settings, then run the staff review again."
            : error.message);
        if (button) { button.disabled = false; button.textContent = "RUN STAFF REVIEW"; }
    }
}

function severityColor(severity) {
    return severity === "critical" ? "#ef4444" : severity === "warning" ? "#f59e0b" : severity === "decision" ? "#4da3ff" : "#64748b";
}

function formatTime(ts) {
    if (!ts) return "";
    try { return new Date(ts).toLocaleString(); } catch { return ts; }
}

async function loadChiefOfStaff() {
    const workspace = document.getElementById("conversation");
    if (!workspace) return;
    await chiefAutoLogin();
    workspace.innerHTML = `<div class="module-shell chief-center"><div class="module-loading"><div class="loading-pulse"></div><span>Preparing the staff overview…</span></div></div>`;
    try {
        const response = await chiefFetch("/api/chief-of-staff");
        if (!response.ok) throw new Error(`Chief of Staff returned HTTP ${response.status}`);
        const data = await response.json();
        let oversight = data.oversight;
        if (!oversight) {
            const operationsResponse = await chiefFetch("/api/chief-of-staff/operations");
            const contentType = operationsResponse.headers.get("content-type") || "";
            if (!operationsResponse.ok || !contentType.includes("application/json")) {
                throw new Error("The JARVIS backend is still running the previous release. Restart it, then refresh this page.");
            }
            const operationsPayload = await operationsResponse.json();
            oversight = operationsPayload.data;
        }
        if (!oversight?.metrics || !Array.isArray(oversight.roster)) {
            throw new Error("The JARVIS backend is still running the previous release. Restart it, then refresh this page.");
        }

        const m = oversight.metrics;
        const numBlocked = m.blockedAgents || 0;
        const numAlerts = (oversight.alerts || []).length;
        const numApprovals = m.pendingApprovals || 0;
        const numRuns = (oversight.recentRuns || []).length;

        const briefing = oversight.briefing?.reasoning || oversight.lastReasoning?.reasoning || null;
        const gaps = oversight.functionalGaps || [];
        const learn = oversight.learning || {};
        const comp = oversight.competitive || {};
        const health = oversight.agentHealth || {};
        const activity = oversight.recentActivity || [];
        const approvals = oversight.pendingApprovalDetails || [];

        const criticalGaps = gaps.filter(g => g.severity === "critical");
        const warningGaps = gaps.filter(g => g.severity === "warning");
        const decisionGaps = gaps.filter(g => g.severity === "decision");

        workspace.innerHTML = `
            <div class="module-shell chief-center">
                <div class="module-hero chief-hero">
                    <div>
                        <div class="eyebrow">CHIEF OF STAFF · v${chiefEscape(oversight.agent.version)}</div>
                        <h1>Operational Command</h1>
                        <p>${m.agentsOverseen} agents · ${numBlocked} blocked · ${numApprovals} approvals · ${numAlerts} alerts</p>
                    </div>
                    <div class="chief-actions">
                        <div class="system-status"><span class="status-dot"></span> OPERATIONAL</div>
                        <button id="chiefRunReview" class="chief-run" onclick="runChiefReview()">RUN STAFF REVIEW</button>
                    </div>
                </div>

                <div class="chief-boundary"><strong>Coordination layer:</strong> specialist agents own execution. The Chief of Staff cannot override you, bypass policy or approvals, contact anyone, run in the background, spend money, or access financial accounts.</div>

                ${briefing ? `
                <section class="module-card full">
                    <div class="card-label" style="color:#22c55e">RECOMMENDATIONS</div>
                    <h2>What JARVIS suggests doing</h2>
                    <div class="chief-briefing">${chiefEscape(briefing).replace(/\n/g, "<br>")}</div>
                    <small style="color:#64748b;display:block;margin-top:8px">Analysis from ${chiefEscape(oversight.lastReasoning?.provider || oversight.briefing?.provider || "LLM")} · ${formatTime(oversight.briefing?.generatedAt || oversight.lastReasoning?.generatedAt)}</small>
                </section>
                ` : `<section class="module-card full">
                    <div class="card-label" style="color:#f59e0b">RECOMMENDATIONS</div>
                    <h2>No analysis available</h2>
                    <p style="color:#64748b">Run Staff Review or configure an LLM provider to get AI-powered recommendations.</p>
                </section>`}

                <div class="module-grid chief-grid">
                    ${criticalGaps.length > 0 || warningGaps.length > 0 || decisionGaps.length > 0 ? `
                    <section class="module-card full">
                        <div class="card-label" style="color:#f59e0b">WHAT NEEDS FIXING</div>
                        <h2>${gaps.length} thing(s) need attention</h2>
                        <div class="chief-stack">
                            ${gaps.map(g => `
                                <article class="chief-item" style="border-left:3px solid ${severityColor(g.severity)};padding-left:12px;">
                                    <div>
                                        <strong style="color:${severityColor(g.severity)}">${chiefEscape(g.severity.toUpperCase())}</strong>
                                        <span style="color:#94a3b8;font-size:0.85em">${chiefEscape(g.area)}</span>
                                        <p style="margin:2px 0 0;color:#e2e8f0">${chiefEscape(g.detail)}</p>
                                    </div>
                                </article>
                            `).join("")}
                        </div>
                    </section>
                    ` : `<section class="module-card full">
                        <div class="card-label" style="color:#22c55e">WHAT NEEDS FIXING</div>
                        <h2>All clear — no gaps detected</h2>
                        <p style="color:#64748b">No functional gaps, blockers, or issues identified. Systems are operating normally.</p>
                    </section>`}

                    ${approvals.length > 0 ? `
                    <section class="module-card full">
                        <div class="card-label" style="color:#4da3ff">PENDING APPROVALS</div>
                        <h2>${approvals.length} item(s) waiting on you</h2>
                        <div class="chief-stack">
                            ${approvals.map(a => `
                                <article class="chief-item">
                                    <span class="chief-rank" style="background:rgba(77,163,255,.15);color:#99ccff;">!</span>
                                    <div>
                                        <strong>${chiefEscape(a.action || "Approval")}</strong>
                                        <p>${chiefEscape(a.title || "")}</p>
                                        <small style="color:#64748b">${a.createdAt ? formatTime(a.createdAt) : ""} · ${a.approvalId ? "ID: " + chiefEscape(a.approvalId.slice(0, 8)) : ""}</small>
                                    </div>
                                </article>
                            `).join("")}
                        </div>
                    </section>
                    ` : ""}

                    <section class="module-card full">
                        <div class="card-label">AGENT OVERSIGHT</div>
                        <h2>Specialist network · ${m.agentsOverseen} total</h2>
                        <div class="chief-roster">
                            ${oversight.roster.map(item => {
                                const h = health[item.id] || {};
                                return `<article class="chief-agent">
                                    <div>
                                        <strong>${chiefEscape(item.name)}</strong>
                                        <span class="chief-status ${chiefEscape(item.status)}">${chiefEscape(item.status.replaceAll("-", " "))}</span>
                                    </div>
                                    <p>${chiefEscape(item.responsibility)}</p>
                                    <small>${chiefEscape(item.work)}</small>
                                    ${item.blocker ? `<div class="chief-blocker">BLOCKED: ${chiefEscape(item.blocker)}</div>` : ""}
                                    ${h.healthy !== undefined ? `<small style="color:${h.healthy ? '#22c55e' : '#f59e0b'};display:block;margin-top:4px">Runs: ${h.totalRuns || 0} · Avg qualified: ${h.avgQualified || 0}${h.lastRunAt ? ' · Last: ' + formatTime(h.lastRunAt) : ''}</small>` : ""}
                                    ${item.escalations && item.escalations.length ? `<div class="chief-escalations">${item.escalations.map(e => `<div class="chief-escalation ${chiefEscape(e.severity)}"><span class="chief-escalation-type">${chiefEscape(e.type)}</span> ${chiefEscape(e.message)}<small>${formatTime(e.raisedAt)}</small></div>`).join("")}</div>` : ""}
                                </article>`;
                            }).join("")}
                        </div>
                    </section>

                    <section class="module-card full">
                        <div class="card-label">LEARNING & INTELLIGENCE</div>
                        <h2>What JARVIS has learned</h2>
                        <div class="chief-metrics" style="grid-template-columns:repeat(auto-fit,minmax(100px,1fr));margin-bottom:12px">
                            <div class="chief-metric"><span>Decisions</span><strong>${learn.decisions || 0}</strong></div>
                            <div class="chief-metric"><span>Outcomes</span><strong>${learn.outcomes || 0}</strong></div>
                            <div class="chief-metric"><span>Corrections</span><strong>${learn.corrections || 0}</strong></div>
                            <div class="chief-metric"><span>Blocked Names</span><strong>${learn.extractionRules || 0}</strong></div>
                        </div>
                        ${(learn.summary || []).length > 0 ? `<div class="chief-stack">${learn.summary.map(s => `<div style="font-size:0.85em;color:#94a3b8;padding:3px 0">• ${chiefEscape(s)}</div>`).join("")}</div>` : `<p style="color:#64748b">No learning data yet. Approvals, corrections, and email replies will build patterns.</p>`}
                        ${(learn.recentCorrections || []).length > 0 ? `
                            <div style="margin-top:12px;padding-top:12px;border-top:1px solid rgba(255,255,255,0.06)">
                                <small style="color:#64748b;text-transform:uppercase;letter-spacing:0.05em">Recent name corrections</small>
                                ${learn.recentCorrections.map(c => `<div style="font-size:0.85em;color:#94a3b8;padding:3px 0">• ${chiefEscape(c.original)} → <strong style="color:#e2e8f0">${chiefEscape(c.corrected)}</strong></div>`).join("")}
                            </div>
                        ` : ""}
                    </section>

                    ${comp.totalCompetitors > 0 ? `
                    <section class="module-card full">
                        <div class="card-label">COMPETITIVE INTELLIGENCE</div>
                        <h2>${comp.totalCompetitors} competitors tracked</h2>
                        <div class="chief-stack">
                            ${(comp.topCompetitors || []).map(c => `
                                <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:0.9em;border-bottom:1px solid rgba(255,255,255,0.04)">
                                    <span style="color:#e2e8f0">${chiefEscape(c.name)}</span>
                                    <span style="color:#64748b;font-size:0.85em">${c.totalSightings || 0} sightings${c.categories && c.categories.length ? ' · ' + chiefEscape(c.categories.join(", ")) : ""}</span>
                                </div>
                            `).join("")}
                        </div>
                    </section>
                    ` : ""}

                    ${activity.length > 0 ? `
                    <section class="module-card full">
                        <div class="card-label">RECENT ACTIVITY</div>
                        <h2>Last ${Math.min(activity.length, 10)} events</h2>
                        <div class="chief-stack">
                            ${activity.slice(0, 10).map(a => `
                                <div style="display:flex;gap:8px;padding:4px 0;font-size:0.85em;border-bottom:1px solid rgba(255,255,255,0.03)">
                                    <span style="color:#64748b;white-space:nowrap">${formatTime(a.timestamp)}</span>
                                    <span style="color:${a.phase === 'observed' ? '#94a3b8' : a.phase === 'executed' ? '#22c55e' : a.phase === 'prepared' ? '#f59e0b' : '#4da3ff'};text-transform:capitalize">${chiefEscape(a.phase)}</span>
                                    <span style="color:#e2e8f0">${chiefEscape(a.summary)}</span>
                                </div>
                            `).join("")}
                        </div>
                    </section>
                    ` : ""}

                    <section class="module-card full">
                        <div class="card-label">STAFF REVIEW HISTORY</div>
                        <h2>${numRuns} review(s) on record</h2>
                        <div class="chief-stack">${chiefList(oversight.recentRuns.slice(0, 5), item => `
                            <article class="chief-run-row">
                                <strong>${formatTime(item.runAt)}</strong>
                                <span>${item.agentsReviewed || 0} agents · ${item.alertsPrepared || 0} alerts</span>
                            </article>`, "No staff review has been run yet. Use Run Staff Review after signing in as an operator.")}
                        </div>
                    </section>
                </div>
            </div>`;
    } catch (error) {
        workspace.innerHTML = `<div class="module-shell chief-center"><div class="module-error"><div class="eyebrow">CHIEF OF STAFF ERROR</div><h2>Unable to load operations</h2><p>${chiefEscape(error.message)}</p><button onclick="loadChiefOfStaff()">Retry</button></div></div>`;
    }
}

window.loadChiefOfStaff = loadChiefOfStaff;
window.runChiefReview = runChiefReview;
