(function () {
    const escape = value => { const node = document.createElement("div"); node.textContent = String(value ?? ""); return node.innerHTML; };

    async function autoLogin() {
        if (sessionStorage.getItem("jarvis.authToken")) return;
        try {
            const r = await fetch("/api/auth/auto-login", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ deviceName: "JARVIS auto" }) });
            if (r.ok) { const d = await r.json(); if (d?.data?.token) sessionStorage.setItem("jarvis.authToken", d.data.token); }
        } catch (e) {}
    }

    function authHeaders() {
        const h = { "Content-Type": "application/json" };
        const t = sessionStorage.getItem("jarvis.authToken");
        if (t) h["Authorization"] = `Bearer ${t}`;
        return h;
    }

    function formatAction(action) {
        const labels = {
            "add_prospects_to_crm": "New Prospect",
            "enrich_crm_prospect": "Enrich Prospect",
            "update_crm_prospect": "Update Prospect",
            "outreach_email": "Outreach Draft",
            "review_scheduler_finding": "Scheduler Finding",
            "review_venture_candidate": "AVO Candidate",
            "prepare_venture_assets": "AVO Assets",
            "approve_venture_message": "AVO Message"
        };
        return labels[action] || action;
    }

    function formatStatus(status) {
        if (status === "pending") return '<span class="opportunity-stage" style="border-color:#f59e0b;color:#f59e0b">PENDING</span>';
        if (status === "approved") return '<span class="opportunity-stage" style="border-color:#22c55e;color:#22c55e">APPROVED</span>';
        if (status === "denied") return '<span class="opportunity-stage" style="border-color:#ef4444;color:#ef4444">DENIED</span>';
        if (status === "expired") return '<span class="opportunity-stage" style="border-color:#6b7280;color:#6b7280">EXPIRED</span>';
        return `<span class="opportunity-stage">${escape(status)}</span>`;
    }

    async function loadOpportunities() {
        await autoLogin();
        const workspace = document.getElementById("conversation");
        workspace.innerHTML = `<section class="opportunity-center"><div class="opportunity-panel">Loading opportunities...</div></section>`;

        try {
            const token = sessionStorage.getItem("jarvis.authToken") || "";
            const authHeaders = token ? {"Authorization": "Bearer " + token} : {};
            const fetchOpts = {credentials: "include", headers: authHeaders};
            const [hubResponse, ventureResponse] = await Promise.all([
                fetch("/api/agent-hub", fetchOpts).catch(() => null),
                fetch("/api/venture-agent/status", fetchOpts).catch(() => null)
            ]);

            const hubData = hubResponse?.ok ? await hubResponse.json() : null;
            const ventureData = ventureResponse?.ok ? await ventureResponse.json() : null;

            const items = hubData?.data?.items || [];
            const summary = hubData?.data?.summary || {};

            const pending = items.filter(i => i.status === "pending");
            const approved = items.filter(i => i.status === "approved");
            const denied = items.filter(i => i.status === "denied");

            const prospectItems = items.filter(i => i.type === "opportunity-candidate" || i.type === "governance-approval");
            const ventureItems = items.filter(i => i.type === "renewal-brief" || (i.context?.type === "venture-candidate") || (i.context?.type === "xodus-research-candidate"));
            const discoveryItems = items.filter(i => i.context?.type === "market-discovery-prospect" || i.context?.type === "opportunity-pilot-prospect");

            const venture = ventureData?.data;
            const ventureDecisions = new Map((venture?.decisions || []).map(item => [item.candidateId, item.decision]));

            workspace.innerHTML = `<section class="opportunity-center">
                <header class="opportunity-hero">
                    <div>
                        <div class="eyebrow">JARVIS OS / REVENUE ENGINE</div>
                        <h1>Opportunities</h1>
                        <p>Everything agents discovered, waiting for your decision.</p>
                    </div>
                    <span>NO EXTERNAL ACTIONS</span>
                </header>

                <div class="opportunity-metrics">
                    <article><small>PENDING</small><strong>${pending.length}</strong></article>
                    <article><small>APPROVED</small><strong>${approved.length}</strong></article>
                    <article><small>DISCOVERED</small><strong>${summary.totalItems || items.length}</strong></article>
                    <article><small>DENIED</small><strong>${denied.length}</strong></article>
                </div>

                ${pending.length ? `
                <div class="opportunity-panel">
                    <div class="eyebrow">WAITING FOR YOUR DECISION</div>
                    <h2>${pending.length} items need approval</h2>
                    <div class="opportunity-list">
                        ${pending.map(item => {
                            const ctx = item.context || {};
                            const prospect = ctx.prospect || {};
                            const candidate = ctx.candidate || {};
                            const name = prospect.name || candidate.title || item.title || "Unknown";
                            const detail = prospect.fitScore ? `Fit: ${prospect.fitScore}` : candidate.score ? `Score: ${candidate.score}/100` : "";
                            const source = prospect.source || candidate.source || ctx.lane || "";
                            const note = ctx.note || "";
                            return `<article class="opportunity-card">
                                <div class="opportunity-score" style="border-color:#f59e0b">${detail || "?"}<small>${formatAction(item.action)}</small></div>
                                <div>
                                    ${formatStatus(item.status)}
                                    <h2>${escape(name)}</h2>
                                    ${note ? `<p>${escape(note.slice(0, 120))}</p>` : ""}
                                    <small>${source ? escape(source) + " · " : ""}${item.ventureId ? escape(item.ventureId) : ""} · ${timeAgo(item.requestedAt)}</small>
                                    <div style="margin-top:8px">
                                        <a href="#" onclick="loadModule('agent-hub'); return false;" style="color:#60a5fa;text-decoration:none">Review in Agent Hub →</a>
                                    </div>
                                </div>
                            </article>`;
                        }).join("")}
                    </div>
                </div>
                ` : `
                <div class="opportunity-panel">
                    <div class="eyebrow">ALL CLEAR</div>
                    <h2>Nothing pending</h2>
                    <p>All agent discoveries have been reviewed. Agents will submit new findings on their next scheduled run.</p>
                </div>
                `}

                ${discoveryItems.length ? `
                <div class="opportunity-panel">
                    <div class="eyebrow">MARKET DISCOVERIES</div>
                    <h2>${discoveryItems.length} prospects found by agents</h2>
                    <div class="opportunity-list">
                        ${discoveryItems.slice(0, 10).map(item => {
                            const ctx = item.context || {};
                            const prospect = ctx.prospect || {};
                            return `<article class="opportunity-card">
                                <div class="opportunity-score">${prospect.fitScore || "?"}<small>FIT</small></div>
                                <div>
                                    ${formatStatus(item.status)}
                                    <h2>${escape(prospect.name || item.title || "Unknown")}</h2>
                                    ${prospect.category ? `<p>${escape(prospect.category)}</p>` : ""}
                                    <small>${escape(prospect.source || "market-discovery")} · ${escape(prospect.city || "")}${prospect.city && prospect.state ? ", " : ""}${escape(prospect.state || "")}</small>
                                </div>
                            </article>`;
                        }).join("")}
                    </div>
                </div>
                ` : ""}

                ${venture ? `
                <div class="opportunity-panel avo-agent-panel">
                    <div class="eyebrow">AVO AGENT · ${escape(venture.agent.mode)} · v${escape(venture.agent.version)}</div>
                    <h2>${venture.candidates.length} low-capital revenue candidates</h2>
                    <p>Ranked using evidence, time to revenue, startup cost, fit, margin, risk, and family-time impact.</p>
                    <div class="avo-metrics">
                        <span>ACCEPTED<strong>${venture.metrics.accepted}</strong></span>
                        <span>OFFERS<strong>${venture.metrics.assets}</strong></span>
                        <span>REVENUE<strong>$${Number(venture.metrics.revenue).toLocaleString()}</strong></span>
                        <span>NET<strong>$${Number(venture.metrics.net).toLocaleString()}</strong></span>
                        <span>TIME<strong>${venture.metrics.timeHours}h</strong></span>
                    </div>
                    ${venture.candidates.map(item => `
                        <article class="avo-candidate">
                            <div>
                                <strong>${escape(item.title)}</strong>
                                <small>${escape(item.category)} · ${item.confidence}% confidence · ${escape(ventureDecisions.get(item.id) || "awaiting owner decision")}</small>
                                <div class="avo-actions">
                                    <button data-venture-decision="accepted" data-candidate="${escape(item.id)}">ACCEPT</button>
                                    <button data-venture-decision="deferred" data-candidate="${escape(item.id)}">DEFER</button>
                                    <button data-venture-decision="rejected" data-candidate="${escape(item.id)}">REJECT</button>
                                </div>
                            </div>
                            <span>${item.score}</span>
                        </article>
                    `).join("")}
                </div>
                ` : ""}

                ${approved.length ? `
                <div class="opportunity-panel">
                    <div class="eyebrow">APPROVED (${approved.length})</div>
                    <p>These items have been approved and are ready for action.</p>
                    ${approved.slice(0, 5).map(item => `
                        <div class="activity-item">
                            <span class="activity-dot" style="background:#22c55e"></span>
                            <span class="activity-text">${escape(item.title || item.action)}</span>
                            <span class="activity-time">${timeAgo(item.requestedAt)}</span>
                        </div>
                    `).join("")}
                </div>
                ` : ""}

                <p class="opportunity-boundary">Discovery, scoring, and preparation are internal only. Outreach, publishing, spending, accounts, contracts, and transactions remain disabled.</p>
            </section>`;

            document.querySelectorAll("[data-venture-decision]").forEach(button => {
                button.onclick = async () => {
                    const decision = button.dataset.ventureDecision;
                    const words = { accepted: "ACCEPT", deferred: "DEFER", rejected: "REJECT" };
                    const headers = { "Content-Type": "application/json" };
                    const authToken = sessionStorage.getItem("jarvis.authToken");
                    if (authToken) headers["Authorization"] = `Bearer ${authToken}`;
                    const response = await fetch(`/api/venture-agent/candidates/${button.dataset.candidate}/decision`, {
                        method: "POST",
                        credentials: "include",
                        headers: authHeaders(),
                        body: JSON.stringify({ decision, confirmation: `${words[decision]} OPPORTUNITY` })
                    });
                    const result = await response.json();
                    if (!response.ok) return alert(`Owner session required: ${result.error?.message || result.error}`);
                    loadOpportunities();
                };
            });

        } catch (error) {
            workspace.innerHTML = `<section class="opportunity-center"><div class="opportunity-panel">${escape(error.message)}</div></section>`;
        }
    }

    window.loadOpportunities = loadOpportunities;
}());
