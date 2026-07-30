(function () {
    const esc = value => {
        const node = document.createElement("div");
        node.textContent = String(value ?? "");
        return node.innerHTML;
    };

    let cachedIdentity = null;
    let storedToken = sessionStorage.getItem("jarvis.authToken") || null;

    function authHeaders() {
        const headers = { "Content-Type": "application/json" };
        if (storedToken) headers["Authorization"] = `Bearer ${storedToken}`;
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
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
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

    let pendingInitialTab = null;

    async function loadAgentHub(initialTab) {
        if (initialTab) pendingInitialTab = initialTab;
        const workspace = document.getElementById("conversation");
        workspace.innerHTML = '<section class="agent-hub"><article>Loading agent operations...</article></section>';

        const identity = await checkSession() || await autoLogin();
        if (!identity) {
            workspace.innerHTML = `<section class="agent-hub">
                <header>
                    <div class="eyebrow">JARVIS OS / AGENT HUB</div>
                    <h1>Agent Hub</h1>
                </header>
                <section class="hub-connect-section">
                    <p>Connect with an owner or operator token to manage agents.</p>
                    <div class="hub-connect-form">
                        <input type="password" id="hubTokenInput" placeholder="Paste owner or operator token" />
                        <button id="hubConnectBtn">CONNECT</button>
                    </div>
                </section>
            </section>`;
            workspace.querySelector("#hubConnectBtn").onclick = async () => {
                const input = workspace.querySelector("#hubTokenInput");
                const btn = workspace.querySelector("#hubConnectBtn");
                const token = input.value.trim();
                if (!token) return;
                btn.disabled = true;
                btn.textContent = "CONNECTING...";
                try {
                    await createSession(token);
                    loadAgentHub();
                } catch (err) {
                    alert(`Connection failed: ${err.message}`);
                    btn.disabled = false;
                    btn.textContent = "CONNECT";
                }
            };
            return;
        }

        try {
            const response = await authFetch("/api/agent-hub");
            const type = response.headers.get("content-type") || "";
            if (!response.ok || !type.includes("application/json")) throw new Error(`Agent Hub backend unavailable (HTTP ${response.status}).`);
            const payload = await response.json();
            render(workspace, payload.data);
        } catch (error) {
            workspace.innerHTML = `<section class="agent-hub"><article class="hub-error">${esc(error.message)}</article></section>`;
        }
    }

    function wellNoticedPanel(data, approvalItems, mpoApprovals) {
        const crm = data.crm || {};
        const campaigns = data.campaigns || {};
        const escalations = data.escalations || [];
        const enrichmentSuggestions = data.enrichmentSuggestions || {};
        const state = crm;
        const lastRun = (state.runs || [])[0];

        const statusCounts = crm.crm?.statusCounts || {};
        const notTouched = statusCounts["Not Touched"] || 0;
        const reachedOut = statusCounts["Reached Out"] || 0;
        const actionable = notTouched + reachedOut;

        const pendingCampaigns = (campaigns.activeCampaigns || []).filter(c => c.status === "active");
        const completedCampaigns = (campaigns.activeCampaigns || []).filter(c => c.status === "completed");
        const pendingApprovals = (approvalItems || []).filter(i => i.status === "pending");
        const addProspects = pendingApprovals.filter(i => i.action === "add_prospects_to_crm");
        const enrichProspects = pendingApprovals.filter(i => i.action === "enrich_crm_prospect");

        return `<div class="wn-overview">
            <article class="wn-header-card">
                <span>SUPERVISED · v3.0 · ACTIVE</span>
                <h2>Well Noticed CRM Agent</h2>
                <p>Research, qualify, and enrich prospects for category-exclusive direct mail partnerships across Central Ohio.</p>
            </article>

            <div class="wn-metrics">
                <article><small>ACTIONABLE</small><strong>${actionable}</strong></article>
                <article><small>NOT TOUCHED</small><strong>${notTouched}</strong></article>
                <article><small>REACHED OUT</small><strong>${reachedOut}</strong></article>
                <article><small>ACTIVE CAMPAIGNS</small><strong>${pendingCampaigns.length}</strong></article>
            </div>

            ${lastRun ? `<article class="wn-last-run">
                <h3>Last Research Run</h3>
                <div class="wn-run-detail">
                    <span>${new Date(lastRun.runAt).toLocaleString()}</span>
                    <div>Discovered: <strong>${lastRun.similarDiscovered}</strong> · Qualified: <strong>${lastRun.qualifiedCount}</strong> · Pending Approval: <strong>${lastRun.pendingApproval || 0}</strong></div>
                    <div>Enrichments pending: <strong>${lastRun.pendingEnrichment || 0}</strong> · Strategies: <strong>${lastRun.strategiesPrepared}</strong></div>
                </div>
            </article>` : '<article class="wn-last-run"><h3>Last Research Run</h3><p>No runs yet. Run the agent to discover prospects.</p></article>'}

            <article class="wn-interventions">
                <h3>Human Intervention Required</h3>
                ${escalations.length > 0 ? escalations.map(e => {
                    const ctx = e.context || {};
                    const needsYou = ctx.needsYou || [];
                    const needsYouHtml = needsYou.length > 0
                        ? `<div class="wn-needsyou">${needsYou.map(n => `<span>→ ${esc(n)}</span>`).join('')}</div>`
                        : '';
                    return `<div class="wn-escalation ${esc(e.severity || 'info')}">
                        <strong>${esc(e.title || e.message)}</strong>
                        <small>${esc(e.source || 'unknown')} · ${esc(e.raisedAt || '')}</small>
                        ${needsYouHtml}
                    </div>`;
                }).join("") : '<div class="wn-empty">No escalations. System running smoothly.</div>'}
            </article>

            ${pendingCampaigns.length > 0 ? `<article class="wn-campaigns">
                <h3>Active Campaigns</h3>
                ${pendingCampaigns.map(c => `<div class="wn-campaign-row">
                    <div>
                        <strong>${esc(c.prospectName || c.companyName || "Unknown")}</strong>
                        <small>Step ${c.currentStep || "?"} of ${c.steps?.length || 5} · ${esc(c.category || "")}</small>
                    </div>
                    <div style="display:flex;gap:8px;align-items:center">
                        <span class="wn-campaign-status">${esc(c.status)}</span>
                        <button onclick="window.__pauseCampaign('${esc(c.id)}')" style="padding:4px 10px;background:#f59e0b;color:#000;border:none;border-radius:4px;cursor:pointer;font-size:0.75em">PAUSE</button>
                    </div>
                </div>`).join("")}
            </article>` : ''}

            ${addProspects.length > 0 ? `<article class="wn-approvals" style="border-left:3px solid #22c55e;padding-left:12px;margin-bottom:16px">
                <h3>New Prospects — Pending Approval (${addProspects.length})</h3>
                ${addProspects.map(item => {
                    const p = item.context?.prospect || {};
                    const grade = p.fitGrade || (p.fitScore >= 70 ? "high" : p.fitScore >= 40 ? "medium" : "low");
                    const gradeColor = grade === "high" ? "#22c55e" : grade === "medium" ? "#f59e0b" : "#ef4444";
                    const id = item.approvalId || item.id;
                    const email = p.email || "";
                    const phone = p.phone || "";
                    const execName = p.executiveName || "";
                    const hasContact = !!(email || phone);
                    const contactColor = hasContact ? "#22c55e" : "#ef4444";
                    return `<div class="wn-prospect-row" style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:var(--surface,#1e293b);border-radius:8px;margin-bottom:8px;border:1px solid rgba(255,255,255,0.06)">
                        <div style="flex:1;min-width:0">
                            <strong style="color:#a9f5d7">${esc(p.name || "Unknown")}</strong>
                            <div style="font-size:0.85em;color:#94a3b8;margin-top:2px">
                                ${esc(p.category || "")} · Fit: ${p.fitScore || 0}/100 (<span style="color:${gradeColor}">${esc(grade)}</span>) · ${esc(p.city || "")}${p.state ? ", " + esc(p.state) : ""}
                            </div>
                            <div style="font-size:0.85em;margin-top:4px;display:flex;gap:12px;flex-wrap:wrap">
                                ${email ? `<span style="color:#22c55e">✉ ${esc(email)}</span>` : `<span style="color:#64748b">✉ none</span>`}
                                ${phone ? `<span style="color:#22c55e">☎ ${esc(phone)}</span>` : `<span style="color:#64748b">☎ none</span>`}
                                ${execName ? `<span style="color:#60a5fa">👤 ${esc(execName)}${p.executiveTitle ? " (" + esc(p.executiveTitle) + ")" : ""}</span>` : ""}
                            </div>
                            ${p.sourceUrl ? `<div style="font-size:0.8em;margin-top:2px"><a href="${esc(p.sourceUrl)}" target="_blank" style="color:#60a5fa">${esc(p.sourceUrl)}</a></div>` : ""}
                        </div>
                        <div style="display:flex;gap:8px;margin-left:12px;flex-shrink:0">
                            <button onclick="window.__approveWellNoticedProspect('${esc(id)}')" style="padding:4px 10px;background:#22c55e;color:#000;border:none;border-radius:4px;cursor:pointer;font-size:0.75em">APPROVE</button>
                            <button onclick="window.__denyWellNoticedProspect('${esc(id)}')" style="padding:4px 10px;background:#ef4444;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:0.75em">DENY</button>
                        </div>
                    </div>`;
                }).join("")}
            </article>` : ''}

            ${enrichProspects.length > 0 ? `<article class="wn-enrichments" style="border-left:3px solid #f59e0b;padding-left:12px;margin-bottom:16px">
                <h3>Enrichment Requests (${enrichProspects.length})</h3>
                ${enrichProspects.map(item => {
                    const p = item.context?.prospect || {};
                    const id = item.approvalId || item.id;
                    return `<div id="enrich-card-${esc(id)}" style="padding:10px 14px;background:var(--surface,#1e293b);border-radius:8px;margin-bottom:8px;border:1px solid rgba(255,255,255,0.06)">
                        <div style="display:flex;justify-content:space-between;align-items:center">
                            <div>
                                <strong style="color:#fbbf24">${esc(p.name || "Unknown")}</strong>
                                <div style="font-size:0.85em;color:#94a3b8;margin-top:2px">Row ${p.sheetRow || "?"} · ${esc(p.source || "")} ${p.fitScore ? "· Fit: " + p.fitScore : ""}</div>
                            </div>
                            <div style="display:flex;gap:8px;flex-shrink:0">
                                <button onclick="window.__previewEnrichment('${esc(id)}')" style="padding:4px 10px;background:#f59e0b;color:#000;border:none;border-radius:4px;cursor:pointer;font-size:0.75em">ENRICH & PREVIEW</button>
                                <button onclick="window.__denyWellNoticedProspect('${esc(id)}')" style="padding:4px 10px;background:#ef4444;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:0.75em">DENY</button>
                            </div>
                        </div>
                        <div id="enrich-preview-${esc(id)}"></div>
                    </div>`;
                }).join("")}
            </article>` : ''}

            ${enrichmentSuggestions.suggestions && enrichmentSuggestions.suggestions.length > 0 ? `<article class="wn-campaigns" style="border-left:3px solid #8b5cf6">
                <h3>CRM Health — Suggestions to Cleanse/Enrich</h3>
                <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:12px">
                    <article style="border:1px solid #263548;background:#0b1017;border-radius:8px;padding:10px;text-align:center">
                        <small style="color:#94a3b8;font-size:10px">TOTAL</small>
                        <strong style="display:block;font-size:18px;color:#e2e8f0">${enrichmentSuggestions.total || 0}</strong>
                    </article>
                    <article style="border:1px solid #263548;background:#0b1017;border-radius:8px;padding:10px;text-align:center">
                        <small style="color:#94a3b8;font-size:10px">HAS EMAIL</small>
                        <strong style="display:block;font-size:18px;color:#22c55e">${enrichmentSuggestions.hasEmail || 0}</strong>
                    </article>
                    <article style="border:1px solid #263548;background:#0b1017;border-radius:8px;padding:10px;text-align:center">
                        <small style="color:#94a3b8;font-size:10px">MISSING EMAIL</small>
                        <strong style="display:block;font-size:18px;color:#f59e0b">${enrichmentSuggestions.missingEmail || 0}</strong>
                    </article>
                    <article style="border:1px solid #263548;background:#0b1017;border-radius:8px;padding:10px;text-align:center">
                        <small style="color:#94a3b8;font-size:10px">MISSING BOTH</small>
                        <strong style="display:block;font-size:18px;color:#ef4444">${enrichmentSuggestions.missingBoth || 0}</strong>
                    </article>
                </div>
                <div style="margin-bottom:8px">
                    ${enrichmentSuggestions.suggestions.slice(0, 8).map(s => `
                        <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-top:1px solid #1a2530;font-size:13px">
                            <span style="color:#e2e8f0">${esc(s.name)}</span>
                            <span style="font-size:11px;color:${s.hasBoth ? '#22c55e' : s.hasEmail ? '#f59e0b' : '#ef4444'}">${esc(s.label)}</span>
                        </div>
                    `).join("")}
                </div>
                <div style="display:flex;gap:8px">
                    <button id="wnBatchEnrich" style="border:1px solid #8b5cf6;background:#2e1a5e;color:#c4b5fd;border-radius:8px;padding:8px 16px;cursor:pointer;font-weight:600;font-size:12px">BATCH ENRICH MISSING CONTACTS</button>
                </div>
            </article>` : ''}

            <article class="wn-actions">
                <h3>Actions</h3>
                <div class="wn-action-buttons">
                    <button id="wnRunResearch">RUN RESEARCH</button>
                    <button id="wnRunPlan">GENERATE PLAN</button>
                </div>
                <div id="wnActionResult" class="wn-action-result" hidden></div>
            </article>
        </div>`;
    }

    function xodusPanel(xodus) {
        return `<div class="xodus-overview">
            <article class="xodus-mission">
                <span>SUPERVISED · ${esc(xodus.agent.stage)}</span>
                <h2>${esc(xodus.agent.name)}</h2>
                <p>${esc(xodus.preview.mission)}</p>
                <div class="xodus-source-line">${xodus.knowledge.sourceCount} reviewed sources · ${xodus.knowledge.focusLanes.length} research lanes · ${xodus.metrics.verifiedCandidates} verified candidates</div>
            </article>
            <div class="xodus-lanes">${xodus.knowledge.focusLanes.map(lane => `<article><span>${esc(lane.label)}</span><strong>${esc(lane.objective)}</strong><small>${esc(lane.nextResearch)}</small></article>`).join("")}</div>
            <article class="xodus-sources">
                <h3>Reviewed mission knowledge</h3>
                ${xodus.knowledge.sources.map(source => `<div><strong>${esc(source.title)}</strong><small>${esc(source.type)} · ${esc(source.reliability)}</small><p>${esc(source.limitations)}</p></div>`).join("")}
            </article>
            <article class="xodus-controls">
                <div><strong>Run research review</strong><small>Creates source-linked briefs only. No outreach, spending, or commitments.</small></div>
                <select id="xodusFocus"><option value="all">All research lanes</option>${xodus.knowledge.focusLanes.map(lane => `<option value="${esc(lane.id)}">${esc(lane.label)}</option>`).join("")}</select>
                <button id="runXodusReview">RUN REVIEW</button>
            </article>
            <div id="xodusRunResult" class="xodus-run-result" hidden></div>
        </div>`;
    }

    function avoPanel(venture, mpoApprovals) {
        const revenue = venture.revenue || {};
        const opps = venture.opportunities || {};
        const prospecting = venture.prospecting || {};
        const avoEscalations = venture.escalations || [];
        const candidates = revenue.candidates || [];
        const opportunities = opps.opportunities || [];
        const metrics = opps.metrics || {};

        const pendingCandidates = candidates.filter(c => c.status === "pending" || !c.decision);
        const acceptedCandidates = candidates.filter(c => c.decision === "accepted");
        const prospectingMetrics = prospecting.metrics || {};
        const pendingProspects = prospecting.pendingApproval || [];
        const prospectDrafts = prospecting.drafts || [];
        const sentMessages = prospecting.sentMessages || [];
        const recentRuns = prospecting.recentRuns || [];
        const lastRun = recentRuns[0];

        const mpoItems = mpoApprovals || [];

        return `<div class="avo-overview">
            <article class="avo-header-card">
                <span>SUPERVISED · v2.0</span>
                <h2>JARVIS AVO Agent</h2>
                <p>Market pulse opportunities, revenue discovery, candidate evaluation, and pipeline management.</p>
            </article>

            <div class="avo-metrics">
                <article><small>MPO PIPELINE</small><strong>${mpoItems.length}</strong></article>
                <article><small>CANDIDATES</small><strong>${candidates.length}</strong></article>
                <article><small>PENDING REVIEW</small><strong>${pendingCandidates.length}</strong></article>
                <article><small>ACCEPTED</strong><strong>${acceptedCandidates.length}</strong></article>
                <article><small>OPPORTUNITIES</small><strong>${metrics.totalOpportunities || opportunities.length}</strong></article>
                <article><small>PROSPECTS</small><strong>${prospectingMetrics.totalProspects || 0}</strong></article>
                <article><small>PENDING APPROVAL</small><strong>${prospectingMetrics.byStatus?.["pending-approval"] || pendingProspects.length}</strong></article>
                <article><small>SENT</small><strong>${prospectingMetrics.totalSent || sentMessages.length}</strong></article>
            </div>

            ${mpoItems.length > 0 ? `<article class="avo-approvals" style="border-left:3px solid #8b5cf6">
                <h3>JARVIS Pipeline — Market Pulse Opportunities</h3>
                ${mpoItems.map(item => {
                    const p = item.context?.prospect || {};
                    const opp = item.context?.opportunity || {};
                    const grade = p.fitGrade || (p.fitScore >= 70 ? "high" : p.fitScore >= 40 ? "medium" : "low");
                    const gradeColor = grade === "high" ? "#22c55e" : grade === "medium" ? "#f59e0b" : "#ef4444";
                    return `<div class="avo-candidate-row" style="border-left:3px solid ${gradeColor};padding-left:12px">
                        <div style="flex:1;min-width:0">
                            <strong style="color:#a9f5d7">MPO · ${esc(p.name || "Unknown")} — ${esc(opp.capability || opp.service || "Market Signal")}</strong>
                            <div style="font-size:0.85em;color:#94a3b8;margin-top:2px">
                                ${esc(p.category || "")} · Fit: ${p.fitScore || 0}/100 (${esc(grade)}) · ${esc(p.city || "Columbus")}, ${esc(p.state || "OH")}
                                ${p.email ? ` · ${esc(p.email)}` : ""}
                            </div>
                            ${opp.service ? `<div style="font-size:0.8em;color:#64748b;margin-top:2px">${esc(opp.service)}</div>` : ""}
                            ${p.sourceUrl ? `<div style="font-size:0.8em;margin-top:2px"><a href="${esc(p.sourceUrl)}" target="_blank" style="color:#60a5fa">${esc(p.sourceUrl)}</a></div>` : ""}
                        </div>
                        <div style="display:flex;gap:8px;margin-left:12px;flex-shrink:0">
                            <button onclick="window.__enrichMPO('${esc(item.approvalId || item.id || "")}')" style="padding:6px 12px;background:#8b5cf6;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:0.8em">ENRICH → CRM</button>
                            <button onclick="window.__approveMPO('${esc(item.approvalId || item.id || "")}')" style="padding:6px 12px;background:#22c55e;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:0.8em">APPROVE</button>
                            <button onclick="window.__denyMPO('${esc(item.approvalId || item.id || "")}')" style="padding:6px 12px;background:#6b7280;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:0.8em">REJECT</button>
                        </div>
                    </div>`;
                }).join("")}
            </article>` : ''}

            ${pendingCandidates.length > 0 ? `<article class="avo-approvals">
                <h3>Pending Candidate Approval</h3>
                ${pendingCandidates.slice(0, 10).map(c => `<div class="avo-candidate-row">
                    <div>
                        <strong>${esc(c.title)}</strong>
                        <small>Score: ${c.score || c.fitScore || "?"} · ${esc(c.customer || c.category || "")}</small>
                    </div>
                    <div class="avo-candidate-actions">
                        <button class="btn-approve" data-avo-accept="${esc(c.id)}">ACCEPT</button>
                        <button class="btn-deny" data-avo-reject="${esc(c.id)}">REJECT</button>
                    </div>
                </div>`).join("")}
            </article>` : ''}

            ${pendingProspects.length > 0 ? `<article class="avo-prospects">
                <h3>Prospects Pending Your Approval</h3>
                ${pendingProspects.map(p => `<div class="avo-prospect-row" style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:var(--surface,#1e293b);border-radius:8px;margin-bottom:8px;border:1px solid rgba(255,255,255,0.06)">
                    <div style="flex:1;min-width:0">
                        <div style="font-weight:600">${esc(p.name)}</div>
                        <div style="font-size:0.85em;color:#94a3b8">
                            ${esc(p.serviceTitle || "")} · Fit: ${p.fitScore || 0} (${esc(p.fitGrade || "?")}) · ${esc(p.city || "")}
                        </div>
                        ${p.sourceUrl ? `<div style="font-size:0.8em;color:#64748b;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis"><a href="${esc(p.sourceUrl)}" target="_blank" style="color:#60a5fa">${esc(p.sourceUrl)}</a></div>` : ""}
                    </div>
                    <div style="display:flex;gap:8px;margin-left:12px;flex-shrink:0">
                        <button onclick="window.__draftVentureProspect('${esc(p.prospectId || p.id || "")}')" style="padding:6px 12px;background:#3b82f6;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:0.8em">DRAFT EMAIL</button>
                    </div>
                </div>`).join("")}
            </article>` : ''}

            ${prospectDrafts.length > 0 ? `<article class="avo-drafts">
                <h3>Outreach Drafts</h3>
                ${prospectDrafts.map(d => `<div style="padding:12px 14px;background:var(--surface,#1e293b);border-radius:8px;margin-bottom:8px;border:1px solid rgba(255,255,255,0.06)">
                    <div style="display:flex;justify-content:space-between;align-items:center">
                        <div>
                            <strong>${esc(d.prospectName)}</strong>
                            <small style="color:#94a3b8"> · ${esc(d.serviceTitle || "")}</small>
                        </div>
                        <span style="font-size:0.8em;padding:3px 8px;border-radius:4px;${d.status === "approved" ? "background:#22c55e33;color:#22c55e" : d.status === "sent" ? "background:#3b82f633;color:#3b82f6" : "background:#f59e0b33;color:#f59e0b"}">${esc(d.status)}</span>
                    </div>
                    <div style="font-size:0.85em;color:#94a3b8;margin-top:4px">Subject: ${esc(d.subject)}</div>
                    ${d.status === "draft" ? `<div style="margin-top:8px;display:flex;gap:8px">
                        <button onclick="window.__approveVentureDraft('${esc(d.id)}')" style="padding:6px 12px;background:#22c55e;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:0.8em">APPROVE</button>
                    </div>` : ''}
                    ${d.status === "approved" ? `<div style="margin-top:8px;display:flex;gap:8px">
                        <button onclick="window.__sendVentureDraft('${esc(d.id)}')" style="padding:6px 12px;background:#3b82f6;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:0.8em">SEND NOW</button>
                    </div>` : ''}
                </div>`).join("")}
            </article>` : ''}

            ${sentMessages.length > 0 ? `<article class="avo-sent">
                <h3>Sent Messages</h3>
                ${sentMessages.slice(0, 5).map(m => `<div style="padding:8px 14px;font-size:0.85em;color:#94a3b8">
                    <strong>${esc(m.prospectName)}</strong> · ${esc(m.serviceId || "")} · ${m.sentAt ? new Date(m.sentAt).toLocaleDateString() : ""}
                </div>`).join("")}
            </article>` : ''}

            ${opportunities.length > 0 ? `<article class="avo-opps">
                <h3>Revenue Opportunities</h3>
                ${opportunities.slice(0, 10).map(o => `<div class="avo-opp-row">
                    <div>
                        <strong>${esc(o.title)}</strong>
                        <small>${esc(o.stage || "discovered")} · Fit: ${o.fitGrade || o.fitScore || "?"} · ${esc(o.category || "")}</small>
                    </div>
                </div>`).join("")}
            </article>` : ''}

            ${candidates.length === 0 && opportunities.length === 0 && pendingProspects.length === 0 ? '<article class="avo-empty"><p>No candidates, opportunities, or prospects discovered yet. Run AVO discovery to start.</p></article>' : ''}

            ${avoEscalations.length > 0 ? `<article class="avo-approvals" style="border-left:3px solid #f59e0b">
                <h3>System Alerts</h3>
                ${avoEscalations.map(e => {
                    const ctx = e.context || {};
                    const needsYou = ctx.needsYou || [];
                    const needsYouHtml = needsYou.length > 0
                        ? `<div class="wn-needsyou" style="margin-top:4px">${needsYou.map(n => `<span style="color:#f4d978;font-size:11px">→ ${esc(n)}</span>`).join('')}</div>`
                        : '';
                    return `<div style="padding:8px 12px;border-left:3px solid ${e.severity === 'critical' ? '#ef4444' : '#f4d978'};margin-bottom:6px;background:#1a1812;border-radius:6px">
                        <strong style="font-size:13px;color:#e2e8f0">${esc(e.message || e.title || 'Alert')}</strong>
                        <div style="font-size:11px;color:#94a3b8;margin-top:2px">${esc(e.agentId)} · ${esc(e.raisedAt || '')}</div>
                        ${needsYouHtml}
                    </div>`;
                }).join("")}
            </article>` : ''}

            <article class="avo-actions">
                <h3>Actions</h3>
                <div class="avo-action-buttons">
                    <button id="ventureRunDiscovery">RUN AVO DISCOVERY</button>
                    <button id="ventureRunOpps">RUN OPPORTUNITY DISCOVERY</button>
                    <button id="ventureRunProspecting">RUN PROSPECTING (All Services)</button>
                    <button id="ventureRunVisibilityAudit">PROSPECT: Visibility Audit Only</button>
                </div>
                <div id="ventureActionResult" class="avo-action-result" hidden></div>
            </article>
        </div>`;
    }

    function contentPanel(content) {
        const agent = content.agent || {};
        const capabilities = content.capabilities || [];
        const ventures = content.ventures || [];
        const platforms = content.platforms || {};
        const templates = content.templates || {};

        return `<div class="content-overview">
            <article class="content-header-card">
                <span>SUPERVISED · v${esc(agent.version || "1.0")}</span>
                <h2>${esc(agent.name || "Content Agent")}</h2>
                <p>${esc(agent.mission || "Website review, social media content, and print ad design across ventures.")}</p>
            </article>

            <article class="content-knowledge">
                <h3>What It Knows</h3>
                <div class="content-avos">
                    <h4>AVO Brands</h4>
                    ${ventures.map(v => `<div class="content-avo-row">
                        <strong>${esc(v.name)}</strong>
                        <small>${esc(v.tagline || "")} · ${esc(v.industry || "")}</small>
                    </div>`).join("")}
                </div>
                <div class="content-platforms">
                    <h4>Platform Specs</h4>
                    ${Object.entries(platforms).map(([key, spec]) => `<div class="content-platform-row">
                        <strong>${esc(key)}</strong>
                        <small>${esc(spec.dimensions || spec.format || "")} ${spec.specs ? "· " + esc(spec.specs) : ""}</small>
                    </div>`).join("")}
                </div>
            </article>

            <article class="content-capabilities">
                <h3>Capabilities</h3>
                ${capabilities.map(cap => `<div class="content-cap-row">
                    <strong>${esc(cap.name || cap)}</strong>
                    <small>${esc(cap.description || "")}</small>
                </div>`).join("")}
            </article>

            <article class="content-support">
                <h3>How It Supports Other Agents</h3>
                <div class="content-support-list">
                    <div class="content-support-row">
                        <strong>Well Noticed CRM Agent</strong>
                        <small>Generates print ad content, website copy, and social media posts for prospect outreach packages</small>
                    </div>
                    <div class="content-support-row">
                        <strong>AVO Agent</strong>
                        <small>Creates landing pages, sales sheets, and offer documents for accepted candidates</small>
                    </div>
                    <div class="content-support-row">
                        <strong>Xodus Agent</strong>
                        <small>Produces mission-aligned content for recovery community outreach and partnership development</small>
                    </div>
                </div>
            </article>

            <article class="content-actions">
                <h3>Actions</h3>
                <div class="content-action-buttons">
                    <button id="contentReviewWebsite">REVIEW WEBSITE</button>
                    <button id="contentGenerateSocial">GENERATE SOCIAL</button>
                    <button id="contentGeneratePrint">GENERATE PRINT AD</button>
                </div>
                <div id="contentActionResult" class="content-action-result" hidden></div>
            </article>
        </div>`;
    }

    function renderReviewItem(item) {
        const approvalButtons = item.approvalId ? `
            <div class="hub-approval-actions">
                <button data-approval="${esc(item.approvalId)}" class="btn-approve">APPROVE</button>
                <button data-deny="${esc(item.approvalId)}" class="btn-deny">DENY</button>
            </div>` : "";
        return `<article class="hub-row">
            <div>
                <span>${esc(item.type)} · ${esc(item.status)}</span>
                <strong>${esc(item.title)}</strong>
                <small>${item.confidence ? `${esc(item.confidence)}% confidence · ` : ""}${esc(item.ventureId || "internal")}</small>
            </div>
            ${approvalButtons}
        </article>`;
    }

    function renderBatchSection(items) {
        const approvals = items.filter(i => i.type === "governance-approval" && i.status === "pending");
        if (approvals.length === 0) return "";
        const groups = {};
        approvals.forEach(item => {
            const action = item.action || "other";
            if (!groups[action]) groups[action] = [];
            groups[action].push(item);
        });
        let html = '<div class="batch-approvals"><h3>Batch Approvals</h3>';
        for (const [action, group] of Object.entries(groups)) {
            const actionLabel = action.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
            html += `<div class="batch-group">
                <div class="batch-header">
                    <strong>${esc(actionLabel)} (${group.length})</strong>
                    <div class="batch-actions">
                        <button class="btn-batch-approve" data-ids="${group.map(i => i.approvalId).join(",")}">APPROVE ALL</button>
                        <button class="btn-batch-deny" data-ids="${group.map(i => i.approvalId).join(",")}">DENY ALL</button>
                    </div>
                </div>
                <div class="batch-items">${group.map(item => `<div class="batch-item"><span class="batch-item-title">${esc(item.title)}</span><span class="batch-item-status">${esc(item.status)}</span></div>`).join("")}</div>
            </div>`;
        }
        html += '</div>';
        return html;
    }

    function renderRegistry(registry) {
        const statusOrder = { "active": 0, "research-phase": 1, "paused-no-customers": 2, "planned": 3 };
        const sorted = [...registry].sort((a, b) => (statusOrder[a.status] || 9) - (statusOrder[b.status] || 9));

        return sorted.map(agent => {
            const statusClass = agent.status === "active" ? "reg-active" : agent.status === "planned" ? "reg-planned" : agent.status === "research-phase" ? "reg-research" : "reg-paused";
            return `<article class="hub-row reg-row">
                <div>
                    <span class="reg-status ${statusClass}">${esc(agent.status.toUpperCase())} · ${esc(agent.mode)}</span>
                    <strong>${esc(agent.name)}</strong>
                    <small>${esc(agent.mission)}</small>
                </div>
                <span class="reg-source">${esc(agent.source)}</span>
            </article>`;
        }).join("");
    }

    function mpoPanel(mpoApprovals) {
        const filtered = mpoApprovals.filter(item => {
            const score = item.context?.prospect?.fitScore || 0;
            return score >= 10;
        });
        return `<div class="mpo-overview">
            <article class="mpo-header-card">
                <h2>Market Pulse Opportunities</h2>
                <p>Revenue opportunities discovered by JARVIS from Columbus-area market signals, job postings, and business news.</p>
            </article>
            <div class="mpo-metrics">
                <article><small>PENDING</small><strong>${filtered.length}</strong></article>
            </div>
            ${filtered.length > 0 ? `<article class="mpo-list">
                ${filtered.map(item => {
                    const ctx = item.context || {};
                    const p = ctx.prospect || {};
                    const opp = ctx.opportunity || {};
                    const score = p.fitScore || 0;
                    const grade = score >= 60 ? "high" : score >= 30 ? "medium" : "low";
                    const gradeColor = grade === "high" ? "#22c55e" : grade === "medium" ? "#f59e0b" : "#64748b";
                    const id = item.approvalId || item.id;
                    return `<div class="mpo-row" style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;background:var(--surface,#1e293b);border-radius:8px;margin-bottom:8px;border:1px solid rgba(255,255,255,0.06);border-left:3px solid ${gradeColor}">
                        <div style="flex:1;min-width:0">
                            <strong style="color:#c4b5fd">${esc(p.name || "Unknown")}</strong>
                            <div style="font-size:0.85em;color:#94a3b8;margin-top:2px">
                                ${opp.capability ? esc(opp.capability) : ""}${opp.service ? " — " + esc(opp.service) : ""}
                            </div>
                            <div style="font-size:0.8em;color:#64748b;margin-top:2px">
                                Fit: ${score}/100 (<span style="color:${gradeColor}">${esc(grade)}</span>) · ${esc(p.city || "Columbus")}, ${esc(p.state || "OH")} · ${esc(p.category || "General")}
                            </div>
                            ${opp.pitch ? `<div style="font-size:0.8em;color:#94a3b8;margin-top:4px;font-style:italic">"${esc(opp.pitch.slice(0, 200))}"</div>` : ""}
                        </div>
                        <div style="display:flex;gap:8px;margin-left:12px;flex-shrink:0">
                            <button onclick="window.__approveMPO('${esc(id)}')" style="padding:6px 12px;background:#22c55e;color:#000;border:none;border-radius:6px;cursor:pointer;font-size:0.8em">APPROVE</button>
                            <button onclick="window.__denyMPO('${esc(id)}')" style="padding:6px 12px;background:#6b7280;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:0.8em">REJECT</button>
                        </div>
                    </div>`;
                }).join("")}
            </article>` : `<article class="mpo-empty"><p>No pending market pulse opportunities. Run JARVIS Revenue Discovery in the AVOs tab.</p></article>`}
        </div>`;
    }

    function realEstatePanel() {
        return `<div class="re-overview">
            <article class="re-header-card">
                <h2>Real Estate Agent</h2>
                <p>Property research, market intelligence, and development strategy for Columbus and Central Ohio.</p>
            </article>
            <article class="re-empty" style="padding:20px;text-align:center;color:#64748b">
                <p style="font-size:1.1em;margin-bottom:8px">🔨 Coming Soon</p>
                <p>The Real Estate Agent is in the planning phase. Once active, it will surface property opportunities, market trends, and development intelligence here.</p>
            </article>
        </div>`;
    }

    function learningIntelPanel() {
        const sectionId = "li-" + Date.now();
        return `<div class="li-overview" id="${sectionId}">
            <article class="li-header-card">
                <h2>Learning &amp; Intelligence</h2>
                <p>What JARVIS has learned from outcomes, approvals, and competitive signals. Patterns update automatically as more data flows in.</p>
            </article>
            <div id="${sectionId}-content" style="padding:12px 0;text-align:center;color:#64748b">Loading...</div>
        </div>
        <script>
        (async function() {
            var s = window.__liEsc || (window.__liEsc = function(v) { var d = document.createElement("div"); d.textContent = String(v ?? ""); return d.innerHTML; });
            const el = document.getElementById('${sectionId}-content');
            if (!el) return;
            try {
                const [learnRes, ciRes] = await Promise.all([
                    fetch('/api/learning/insights').then(r => r.json()),
                    fetch('/api/competitive-intel/landscape').then(r => r.json())
                ]);
                const learn = learnRes.ok ? learnRes.data : null;
                const ci = ciRes.ok ? ciRes.data : null;
                const parts = [];

                parts.push('<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px;margin-bottom:16px">');
                parts.push('<article style="padding:16px;background:var(--surface,#1e293b);border-radius:8px;border:1px solid rgba(255,255,255,0.06)"><small style="color:#64748b">OUTCOMES TRACKED</small><div style="font-size:1.6em;font-weight:700;color:#c4b5fd;margin-top:4px">' + (learn && learn.stats ? learn.stats.outcomes : '0') + '</div></article>');
                parts.push('<article style="padding:16px;background:var(--surface,#1e293b);border-radius:8px;border:1px solid rgba(255,255,255,0.06)"><small style="color:#64748b">POSITIVE RATE</small><div style="font-size:1.6em;font-weight:700;color:#22c55e;margin-top:4px">' + (learn && learn.stats && learn.stats.outcomePatterns ? Math.round(learn.stats.outcomePatterns.positiveRate * 100) + '%' : '\u2014') + '</div></article>');
                parts.push('<article style="padding:16px;background:var(--surface,#1e293b);border-radius:8px;border:1px solid rgba(255,255,255,0.06)"><small style="color:#64748b">COMPETITORS TRACKED</small><div style="font-size:1.6em;font-weight:700;color:#f59e0b;margin-top:4px">' + (ci ? ci.totalCompetitors : '0') + '</div></article>');
                parts.push('<article style="padding:16px;background:var(--surface,#1e293b);border-radius:8px;border:1px solid rgba(255,255,255,0.06)"><small style="color:#64748b">DECISIONS ANALYZED</small><div style="font-size:1.6em;font-weight:700;color:#60a5fa;margin-top:4px">' + (learn && learn.stats ? learn.stats.decisions : '0') + '</div></article>');
                parts.push('</div>');

                if (learn && learn.summary && learn.summary.length > 0) {
                    parts.push('<article style="padding:16px;background:var(--surface,#1e293b);border-radius:8px;border:1px solid rgba(255,255,255,0.06);margin-bottom:16px">');
                    parts.push('<h3 style="font-size:0.95em;color:#94a3b8;margin:0 0 8px 0">INSIGHTS</h3>');
                    for (const line of learn.summary) {
                        parts.push('<div style="padding:4px 0;font-size:0.9em;color:#e2e8f0">\u2022 ' + s(line) + '</div>');
                    }
                    parts.push('</article>');
                } else {
                    parts.push('<article style="padding:16px;background:var(--surface,#1e293b);border-radius:8px;border:1px solid rgba(255,255,255,0.06);margin-bottom:16px;text-align:center;color:#64748b">');
                    parts.push('<p>No insights yet. Insights appear once enough approvals, corrections, and email replies accumulate for pattern detection.</p>');
                    parts.push('</article>');
                }

                if (ci && ci.topCompetitors && ci.topCompetitors.length > 0) {
                    parts.push('<article style="padding:16px;background:var(--surface,#1e293b);border-radius:8px;border:1px solid rgba(255,255,255,0.06);margin-bottom:16px">');
                    parts.push('<h3 style="font-size:0.95em;color:#94a3b8;margin:0 0 8px 0">TOP COMPETITORS BY SIGHTING FREQUENCY</h3>');
                    for (const comp of ci.topCompetitors.slice(0, 10)) {
                        const cats = comp.categories ? comp.categories.join(", ") : "";
                        parts.push('<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.04);font-size:0.9em">');
                        parts.push('<span style="color:#e2e8f0">' + s(comp.name) + '</span>');
                        parts.push('<span style="color:#64748b;font-size:0.85em">' + s(cats) + ' \u00b7 ' + comp.totalSightings + ' sightings</span>');
                        parts.push('</div>');
                    }
                    parts.push('</article>');
                }

                if (ci && ci.categoryBreakdown && ci.categoryBreakdown.length > 0) {
                    parts.push('<article style="padding:16px;background:var(--surface,#1e293b);border-radius:8px;border:1px solid rgba(255,255,255,0.06)">');
                    parts.push('<h3 style="font-size:0.95em;color:#94a3b8;margin:0 0 8px 0">COMPETITIVE LANDSCAPE BY CATEGORY</h3>');
                    for (const cat of ci.categoryBreakdown.slice(0, 8)) {
                        const top = cat.topCompetitors && cat.topCompetitors.length > 0 ? cat.topCompetitors.slice(0, 3).map(function(c) { return c.name; }).join(", ") : "\u2014";
                        parts.push('<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.04);font-size:0.9em">');
                        parts.push('<span style="color:#e2e8f0">' + s(cat.category) + '</span>');
                        parts.push('<span style="color:#64748b;font-size:0.85em">' + cat.competitorCount + ' competitors</span>');
                        parts.push('</div>');
                        parts.push('<div style="font-size:0.8em;color:#64748b;padding:0 0 6px 12px;margin-top:-4px">Top: ' + s(top) + '</div>');
                    }
                    parts.push('</article>');
                }

                el.innerHTML = parts.join("");
            } catch(e) {
                el.innerHTML = '<div style="padding:20px;text-align:center;color:#ef4444">Failed to load: ' + s(e.message) + '</div>';
            }
        })();
        <\/script>`;
    }

    function render(workspace, data) {
        const reviewItems = data.items.length
            ? data.items.map(renderReviewItem).join("")
            : '<article class="hub-row">No items require review.</article>';
        const batchSection = renderBatchSection(data.items);

        workspace.innerHTML = `<section class="agent-hub">
            <header>
                <div>
                    <div class="eyebrow">JARVIS OS / AGENT HUB</div>
                    <h1>Agent Hub</h1>
                    <p>${data.registry.length} agents registered · ${data.summary.approvalsPending} pending approvals</p>
                </div>
                <span>${data.summary.total} ITEMS</span>
            </header>
            <nav class="hub-tabs">
                <button data-section="marketpulse" class="tab-active">Market Pulse</button>
                <button data-section="prospects">Prospects</button>
                <button data-section="learningintel">Learning &amp; Intel</button>
                <button data-section="registry">All Agents</button>
            </nav>
            <div id="hubSections">
                <section data-panel="marketpulse">${mpoPanel(data.mpoApprovals || [])}</section>
                <section data-panel="prospects" hidden>
                    <div class="wn-overview">
                        <article class="wn-header-card">
                            <span>READY</span>
                            <h2>Prospect Pipeline</h2>
                            <p>Manage prospects discovered by your agents. Approve additions, enrichments, and outreach.</p>
                        </article>
                        <div class="wn-metrics">
                            <article><small>PENDING APPROVALS</small><strong>${(data.registry || []).length}</strong></article>
                            <article><small>AGENTS ACTIVE</small><strong>0</strong></article>
                            <article><small>OPPORTUNITIES</small><strong>0</strong></article>
                        </div>
                    </div>
                </section>
                <section data-panel="learningintel" hidden>${learningIntelPanel(data)}</section>
                <section data-panel="registry" hidden>
                    <h2>All Agents</h2>
                    ${renderRegistry(data.registry)}
                </section>
            </div>
            <p class="hub-boundary">Review and preparation only. No approval automatically executes outreach, spending, publishing, contracts, or transactions.</p>
        </section>`;

        workspace.querySelectorAll("[data-section]").forEach(button => {
            button.onclick = () => {
                workspace.querySelectorAll("[data-section]").forEach(b => b.classList.remove("tab-active"));
                button.classList.add("tab-active");
                workspace.querySelectorAll("[data-panel]").forEach(panel => {
                    panel.hidden = panel.dataset.panel !== button.dataset.section;
                });
            };
        });

        if (pendingInitialTab) {
            const tabToSelect = pendingInitialTab;
            pendingInitialTab = null;
            const targetBtn = workspace.querySelector(`[data-section="${tabToSelect}"]`);
            if (targetBtn) targetBtn.click();
        }

        workspace.querySelectorAll("[data-approval]").forEach(button => {
            button.onclick = async () => {
                if (!(await ensureAuth())) { alert("Session expired."); return loadAgentHub(); }
                button.disabled = true;
                button.textContent = "APPROVING...";
                try {
                    const response = await authFetch(`/api/agent-hub/approvals/${button.dataset.approval}/approve`, {
                        method: "POST",
                        body: JSON.stringify({ confirmation: "APPROVE" })
                    });
                    const payload = await response.json();
                    if (!response.ok) return alert(`Error: ${payload.error?.message || payload.error}`);
                    loadAgentHub();
                } catch (err) { alert(`Error: ${err.message}`); button.disabled = false; button.textContent = "APPROVE"; }
            };
        });

        workspace.querySelectorAll("[data-deny]").forEach(button => {
            button.onclick = async () => {
                if (!(await ensureAuth())) { alert("Session expired."); return loadAgentHub(); }
                const reason = prompt("Reason for denying (optional):");
                if (reason === null) return;
                button.disabled = true;
                button.textContent = "DENYING...";
                try {
                    const response = await authFetch(`/api/agent-hub/approvals/${button.dataset.deny}/deny`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ confirmation: "DENY", reason })
                    });
                    const payload = await response.json();
                    if (!response.ok) return alert(`Error: ${payload.error?.message || payload.error}`);
                    loadAgentHub();
                } catch (err) { alert(`Error: ${err.message}`); button.disabled = false; button.textContent = "DENY"; }
            };
        });

        workspace.querySelectorAll(".btn-batch-approve").forEach(button => {
            button.onclick = async () => {
                if (!(await ensureAuth())) { alert("Session expired."); return loadAgentHub(); }
                const ids = button.dataset.ids.split(",").filter(Boolean);
                if (ids.length === 0) return;
                if (!confirm(`Approve all ${ids.length} items?`)) return;
                button.disabled = true; button.textContent = "APPROVING...";
                let approved = 0;
                for (const id of ids) {
                    try {
                        const r = await authFetch(`/api/agent-hub/approvals/${id}/approve`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ confirmation: "APPROVE" })
                        });
                        if (r.ok) approved++;
                    } catch (e) {}
                }
                alert(`Approved ${approved} of ${ids.length}.`); loadAgentHub();
            };
        });

        workspace.querySelectorAll(".btn-batch-deny").forEach(button => {
            button.onclick = async () => {
                if (!(await ensureAuth())) { alert("Session expired."); return loadAgentHub(); }
                const ids = button.dataset.ids.split(",").filter(Boolean);
                if (ids.length === 0) return;
                const reason = prompt("Reason for denying (optional):");
                if (reason === null) return;
                if (!confirm(`Deny all ${ids.length}?`)) return;
                button.disabled = true; button.textContent = "DENYING...";
                let denied = 0;
                for (const id of ids) {
                    try {
                        const r = await authFetch(`/api/agent-hub/approvals/${id}/deny`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ confirmation: "DENY", reason })
                        });
                        if (r.ok) denied++;
                    } catch (e) {}
                }
                alert(`Denied ${denied} of ${ids.length}.`); loadAgentHub();
            };
        });

        const wnRunResearch = workspace.querySelector("#wnRunResearch");
        if (wnRunResearch) wnRunResearch.onclick = async () => {
            if (!(await ensureAuth())) { alert("Session expired."); return loadAgentHub(); }
            wnRunResearch.disabled = true;
            const result = workspace.querySelector("#wnActionResult");
            result.hidden = false; result.textContent = "Running Well Noticed research across 20 categories...";
            try {
                const r = await authFetch("/api/well-noticed-crm/run", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ actor: "owner" })
                });
                const p = await r.json();
                if (!r.ok) throw new Error(p.error?.message || "Run failed");
                result.textContent = `Run complete. Discovered: ${p.data.similarDiscovered} · Qualified: ${p.data.qualifiedCount} · Appended: ${p.data.appendedToSheet}`;
                setTimeout(loadAgentHub, 1500);
            } catch (e) { result.textContent = e.message; } finally { wnRunResearch.disabled = false; }
        };

        const wnRunPlan = workspace.querySelector("#wnRunPlan");
        if (wnRunPlan) wnRunPlan.onclick = async () => {
            if (!(await ensureAuth())) { alert("Session expired."); return loadAgentHub(); }
            wnRunPlan.disabled = true;
            const result = workspace.querySelector("#wnActionResult");
            result.hidden = false; result.textContent = "Generating prospecting plan...";
            try {
                const r = await authFetch("/api/well-noticed-crm/plan", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ actor: "owner" })
                });
                const p = await r.json();
                if (!r.ok) throw new Error(p.error?.message || "Plan failed");
                result.textContent = `Plan generated. ${p.data.newProspects?.length || 0} new prospects, ${p.data.enrichments?.length || 0} enrichments recommended.`;
            } catch (e) { result.textContent = e.message; } finally { wnRunPlan.disabled = false; }
        };

        const wnBatchEnrich = workspace.querySelector("#wnBatchEnrich");
        if (wnBatchEnrich) wnBatchEnrich.onclick = async () => {
            if (!(await ensureAuth())) { alert("Session expired."); return loadAgentHub(); }
            if (!confirm("Batch enrich all CRM records missing contact info? This will search the web for each company.")) return;
            wnBatchEnrich.disabled = true;
            wnBatchEnrich.textContent = "ENRICHING...";
            try {
                const r = await authFetch("/api/well-noticed-crm/plan", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ actor: "owner" })
                });
                const p = await r.json();
                if (!r.ok) throw new Error(p.error?.message || "Plan failed");
                const enrichments = p.data.enrichments || [];
                const newPros = p.data.newProspects || [];
                wnBatchEnrich.textContent = `Enrichments: ${enrichments.length}, Prospects: ${newPros.length}`;
                alert(`Plan generated!\n\nNew prospects discovered: ${newPros.length}\nEnrichments for existing CRM: ${enrichments.length}\n\nReview pending approvals in Agent Hub.`);
                setTimeout(loadAgentHub, 1500);
            } catch (e) { alert("Batch enrich failed: " + e.message); } finally { wnBatchEnrich.disabled = false; }
        };

        const runXodus = workspace.querySelector("#runXodusReview");
        if (runXodus) runXodus.onclick = async () => {
            if (!(await ensureAuth())) { alert("Session expired."); return loadAgentHub(); }
            runXodus.disabled = true;
            const result = workspace.querySelector("#xodusRunResult");
            result.hidden = false; result.textContent = "Running research across all lanes...";
            try {
                const r = await authFetch("/api/xodus-agent/runs", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ confirmation: "RUN XODUS REVIEW", focus: workspace.querySelector("#xodusFocus")?.value || "all" })
                });
                const p = await r.json();
                if (!r.ok) throw new Error(p.error?.message || "Run failed");
                result.textContent = `${p.data.candidatesFound || 0} candidates found. ${p.data.preparedCount || 0} brief(s) prepared.`;
            } catch (e) { result.textContent = e.message; } finally { runXodus.disabled = false; }
        };

        const ventureDiscovery = workspace.querySelector("#ventureRunDiscovery");
        if (ventureDiscovery) ventureDiscovery.onclick = async () => {
            if (!(await ensureAuth())) { alert("Session expired."); return loadAgentHub(); }
            ventureDiscovery.disabled = true;
            const result = workspace.querySelector("#ventureActionResult");
            result.hidden = false; result.textContent = "Running venture discovery...";
            try {
                const r = await authFetch("/api/venture-agent/runs", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ confirmation: "RUN VENTURE DISCOVERY" })
                });
                const p = await r.json();
                if (!r.ok) throw new Error(p.error?.message || "Discovery failed");
                result.textContent = `Discovery complete. ${p.data.candidatesFound || 0} candidates evaluated.`;
                setTimeout(loadAgentHub, 1500);
            } catch (e) { result.textContent = e.message; } finally { ventureDiscovery.disabled = false; }
        };

        const ventureOpps = workspace.querySelector("#ventureRunOpps");
        if (ventureOpps) ventureOpps.onclick = async () => {
            if (!(await ensureAuth())) { alert("Session expired."); return loadAgentHub(); }
            ventureOpps.disabled = true;
            const result = workspace.querySelector("#ventureActionResult");
            result.hidden = false; result.textContent = "Running opportunity discovery...";
            try {
                const r = await authFetch("/api/jarvis-opportunities/runs", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ confirmation: "RUN OPPORTUNITY DISCOVERY" })
                });
                const p = await r.json();
                if (!r.ok) throw new Error(p.error?.message || "Discovery failed");
                result.textContent = `Discovery complete. ${p.data.discovered || 0} opportunities found.`;
                setTimeout(loadAgentHub, 1500);
            } catch (e) { result.textContent = e.message; } finally { ventureOpps.disabled = false; }
        };

        const ventureProspecting = workspace.querySelector("#ventureRunProspecting");
        if (ventureProspecting) ventureProspecting.onclick = async () => {
            if (!(await ensureAuth())) { alert("Session expired."); return loadAgentHub(); }
            ventureProspecting.disabled = true;
            const result = workspace.querySelector("#ventureActionResult");
            result.hidden = false; result.textContent = "Running venture prospecting (all services)...";
            try {
                const r = await authFetch("/api/venture-prospecting/run", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({})
                });
                const p = await r.json();
                if (!r.ok) throw new Error(p.error || "Prospecting failed");
                result.textContent = `Prospecting complete. ${p.data.qualified || 0} qualified prospects found, ${p.data.pendingApproval || 0} pending your approval.`;
                setTimeout(loadAgentHub, 1500);
            } catch (e) { result.textContent = e.message; } finally { ventureProspecting.disabled = false; }
        };

        const ventureVisibilityAudit = workspace.querySelector("#ventureRunVisibilityAudit");
        if (ventureVisibilityAudit) ventureVisibilityAudit.onclick = async () => {
            if (!(await ensureAuth())) { alert("Session expired."); return loadAgentHub(); }
            ventureVisibilityAudit.disabled = true;
            const result = workspace.querySelector("#ventureActionResult");
            result.hidden = false; result.textContent = "Prospecting for Visibility Audit targets...";
            try {
                const r = await authFetch("/api/venture-prospecting/run", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ serviceId: "visibility-audit" })
                });
                const p = await r.json();
                if (!r.ok) throw new Error(p.error || "Prospecting failed");
                result.textContent = `Visibility Audit prospecting complete. ${p.data.qualified || 0} qualified, ${p.data.pendingApproval || 0} pending approval.`;
                setTimeout(loadAgentHub, 1500);
            } catch (e) { result.textContent = e.message; } finally { ventureVisibilityAudit.disabled = false; }
        };

        window.__pauseCampaign = async (campaignId) => {
            const reason = prompt("Reason for pausing this campaign:", "Manually paused by owner");
            if (reason === null) return;
            try {
                const r = await authFetch(`/api/venture-operations/campaigns/${campaignId}/pause`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ reason, pausedBy: "owner" })
                });
                const p = await r.json();
                if (!r.ok) throw new Error(p.error || "Pause failed");
                alert("Campaign paused.");
                loadAgentHub();
            } catch (e) { alert("Pause failed: " + e.message); }
        };

        window.__approveWellNoticedProspect = async (approvalId) => {
            try {
                const r = await authFetch(`/api/today-actions/approve/${approvalId}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ confirmation: "APPROVE", approvedBy: "owner" })
                });
                const p = await r.json();
                if (!r.ok) throw new Error(p.error || "Approve failed");
                const card = document.querySelector(`[data-approval="${approvalId}"]`)?.closest(".wn-prospect-row");
                if (card) {
                    card.innerHTML = `<div style="padding:14px;background:#0f2918;border-radius:8px;border:1px solid #22c55e;width:100%">
                        <div style="font-weight:600;color:#22c55e;margin-bottom:4px">Approved & Added to CRM</div>
                        <div style="font-size:0.85em;color:#a9f5d7">Cadence started. You can see it in the Dashboard.</div>
                    </div>`;
                } else {
                    alert("Prospect approved and added to CRM + cadence started.");
                }
            } catch (e) { alert("Approve failed: " + e.message); }
        };

        window.__denyWellNoticedProspect = async (approvalId) => {
            const reason = prompt("Reason for denying:", "Not a fit");
            if (reason === null) return;
            try {
                const r = await authFetch(`/api/today-actions/deny/${approvalId}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ confirmation: "DENY", reason, deniedBy: "owner" })
                });
                const p = await r.json();
                if (!r.ok) throw new Error(p.error || "Deny failed");
                alert("Prospect denied.");
                loadAgentHub();
            } catch (e) { alert("Deny failed: " + e.message); }
        };

        window.__previewEnrichment = async (approvalId) => {
            const previewDiv = document.getElementById("enrich-preview-" + approvalId);
            if (previewDiv) previewDiv.innerHTML = "<div style='margin-top:8px;color:#fbbf24'>Enriching... fetching contact info from web</div>";
            try {
                const r = await authFetch(`/api/well-noticed-crm/enrich-preview/${approvalId}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({})
                });
                const p = await r.json();
                if (!r.ok) throw new Error(p.error || "Enrichment failed");
                const e = p.data?.enrichment || {};
                const emails = e.email ? [e.email, ...(e.emails || [])] : (e.emails || []);
                const phones = e.phone ? [e.phone, ...(e.phones || [])] : (e.phones || []);
                const execName = e.executiveName || e.executives?.[0]?.name || "";
                const website = e.website || "";
                if (previewDiv) {
                    previewDiv.innerHTML = `
                        <div style="margin-top:10px;padding:12px;background:#0f172a;border-radius:6px;border:1px solid rgba(245,158,11,0.3)">
                            <div style="font-weight:600;color:#fbbf24;margin-bottom:8px">Enrichment Results</div>
                            ${emails.length > 0 ? `<div style="margin-bottom:6px"><label style="color:#94a3b8;font-size:0.8em">Email</label><div style="display:flex;gap:6px;align-items:center;margin-top:2px"><input id="enrich-email-${approvalId}" value="${esc(emails[0])}" style="flex:1;padding:4px 8px;background:#1e293b;border:1px solid rgba(255,255,255,0.1);border-radius:4px;color:#e2e8f0;font-size:0.85em" /><input id="enrich-email-ok-${approvalId}" type="checkbox" checked title="Include this email" /></div></div>` : '<div style="color:#64748b;font-size:0.85em;margin-bottom:6px">No email found</div>'}
                            ${phones.length > 0 ? `<div style="margin-bottom:6px"><label style="color:#94a3b8;font-size:0.8em">Phone</label><div style="display:flex;gap:6px;align-items:center;margin-top:2px"><input id="enrich-phone-${approvalId}" value="${esc(phones[0])}" style="flex:1;padding:4px 8px;background:#1e293b;border:1px solid rgba(255,255,255,0.1);border-radius:4px;color:#e2e8f0;font-size:0.85em" /><input id="enrich-phone-ok-${approvalId}" type="checkbox" checked title="Include this phone" /></div></div>` : '<div style="color:#64748b;font-size:0.85em;margin-bottom:6px">No phone found</div>'}
                            ${execName ? `<div style="margin-bottom:6px"><label style="color:#94a3b8;font-size:0.8em">Contact</label><div><input id="enrich-exec-${approvalId}" value="${esc(execName)}" style="width:100%;padding:4px 8px;background:#1e293b;border:1px solid rgba(255,255,255,0.1);border-radius:4px;color:#e2e8f0;font-size:0.85em" /></div></div>` : ''}
                            ${website ? `<div style="font-size:0.8em;color:#60a5fa;margin-top:4px"><a href="${esc(website)}" target="_blank">${esc(website)}</a></div>` : ''}
                            <div style="display:flex;gap:8px;margin-top:10px">
                                <button onclick="window.__approveEnrichment('${esc(approvalId)}')" style="padding:6px 14px;background:#22c55e;color:#000;border:none;border-radius:4px;cursor:pointer;font-size:0.8em;font-weight:600">APPROVE & ADD TO CRM</button>
                                <button onclick="document.getElementById('enrich-preview-${esc(approvalId)}').innerHTML=''" style="padding:6px 14px;background:transparent;color:#94a3b8;border:1px solid rgba(255,255,255,0.1);border-radius:4px;cursor:pointer;font-size:0.8em">CANCEL</button>
                            </div>
                        </div>`;
                }
            } catch (e) {
                if (previewDiv) previewDiv.innerHTML = `<div style="margin-top:8px;color:#ef4444">Error: ${esc(e.message)}</div>`;
            }
        };

        window.__approveEnrichment = async (approvalId) => {
            const card = document.getElementById("enrich-card-" + approvalId);
            const emailEl = document.getElementById("enrich-email-" + approvalId);
            const phoneEl = document.getElementById("enrich-phone-" + approvalId);
            const execEl = document.getElementById("enrich-exec-" + approvalId);
            const body = {};
            if (emailEl && emailEl.value) body.email = emailEl.value;
            if (phoneEl && phoneEl.value) body.phone = phoneEl.value;
            if (execEl && execEl.value) body.executiveName = execEl.value;
            try {
                const r = await authFetch(`/api/well-noticed-crm/approve-enrichment/${approvalId}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(body)
                });
                const p = await r.json();
                if (!r.ok) throw new Error(p.error || "Approve failed");
                const parts = [];
                if (p.data?.crm?.added) parts.push("Added to CRM");
                if (p.data?.campaign?.created) parts.push("Cadence started");
                if (card) {
                    card.innerHTML = `<div style="padding:14px;background:#0f2918;border-radius:8px;border:1px solid #22c55e;margin-bottom:8px">
                        <div style="font-weight:600;color:#22c55e;margin-bottom:4px">Approved & Added</div>
                        <div style="font-size:0.85em;color:#a9f5d7">${parts.length ? parts.join(" · ") : "Added to CRM"}${body.email ? " · Email: " + esc(body.email) : ""}</div>
                        <div style="font-size:0.8em;color:#64748b;margin-top:4px">Cadence will start automatically. You can also see it in the Dashboard.</div>
                    </div>`;
                }
            } catch (e) {
                if (card) {
                    card.innerHTML = `<div style="padding:14px;background:#291010;border-radius:8px;border:1px solid #ef4444;margin-bottom:8px">
                        <div style="font-weight:600;color:#ef4444;margin-bottom:4px">Approve Failed</div>
                        <div style="font-size:0.85em;color:#fca5a5">${esc(e.message)}</div>
                        <button onclick="window.__previewEnrichment('${esc(approvalId)}')" style="margin-top:8px;padding:4px 10px;background:#f59e0b;color:#000;border:none;border-radius:4px;cursor:pointer;font-size:0.75em">TRY AGAIN</button>
                    </div>`;
                } else {
                    alert("Approve failed: " + e.message);
                }
            }
        };

        window.__draftVentureProspect = async (prospectId) => {
            try {
                const r = await authFetch(`/api/venture-prospecting/draft/${prospectId}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ contactName: "" })
                });
                const p = await r.json();
                if (!r.ok) throw new Error(p.error || "Draft failed");
                alert("Draft created! Review in the Outreach Drafts section.");
                loadAgentHub();
            } catch (e) { alert("Draft failed: " + e.message); }
        };

        window.__approveVentureDraft = async (draftId) => {
            try {
                const r = await authFetch(`/api/venture-prospecting/draft/${draftId}/approve`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ confirmation: "APPROVE" })
                });
                if (!r.ok) { const p = await r.json(); throw new Error(p.error || "Approve failed"); }
                alert("Draft approved! Click SEND NOW to send.");
                loadAgentHub();
            } catch (e) { alert("Approve failed: " + e.message); }
        };

        window.__sendVentureDraft = async (draftId) => {
            if (!confirm("Send this outreach email now?")) return;
            try {
                const r = await authFetch(`/api/venture-prospecting/draft/${draftId}/send`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" }
                });
                const p = await r.json();
                if (!r.ok) throw new Error(p.error || "Send failed");
                alert("Email sent successfully!");
                loadAgentHub();
            } catch (e) { alert("Send failed: " + e.message); }
        };

        window.__enrichMPO = async (approvalId) => {
            if (!confirm("Enrich this company's contact data, add to CRM, and start a JARVIS 3-touch cadence?")) return;
            try {
                const r = await authFetch(`/api/agent-hub/approvals/${approvalId}/enrich-mpo`, {
                    method: "POST",
                    body: JSON.stringify({ confirmation: "APPROVE" })
                });
                const p = await r.json();
                if (!r.ok) throw new Error(p.error || "Enrich failed");
                const d = p.data || {};
                const parts = [];
                if (d.enrichment?.email) parts.push(`Email: ${d.enrichment.email}`);
                if (d.enrichment?.phone) parts.push(`Phone: ${d.enrichment.phone}`);
                if (d.enrichment?.executiveName) parts.push(`Contact: ${d.enrichment.executiveName}`);
                if (d.crm?.added) parts.push("Added to CRM");
                if (d.cadence?.created) parts.push(`3-touch cadence started (${d.cadence.cadenceId})`);
                else if (d.cadence?.note) parts.push(d.cadence.note);
                alert("MPO enriched:\n\n" + (parts.length ? parts.join("\n") : "No new data found"));
                loadAgentHub();
            } catch (e) { alert("Enrich failed: " + e.message); }
        };

        window.__approveMPO = async (approvalId) => {
            if (!confirm("Approve this MPO? It will be added to CRM and a JARVIS cadence will start if email is available.")) return;
            try {
                const r = await authFetch(`/api/agent-hub/approvals/${approvalId}/approve`, {
                    method: "POST",
                    body: JSON.stringify({ confirmation: "APPROVE" })
                });
                const p = await r.json();
                if (!r.ok) throw new Error(p.error || "Approve failed");
                const ex = p.execution || {};
                const parts = [];
                if (ex.crm) parts.push("Added to CRM");
                if (ex.cadence) parts.push(`3-touch cadence started (${ex.cadenceId})`);
                else if (ex.cadenceNote) parts.push(ex.cadenceNote);
                if (parts.length) alert("MPO approved: " + parts.join(" · "));
                loadAgentHub();
            } catch (e) { alert("Approve failed: " + e.message); }
        };

        window.__denyMPO = async (approvalId) => {
            const reason = prompt("Reason for rejection (optional):");
            if (reason === null) return;
            try {
                const r = await authFetch(`/api/agent-hub/approvals/${approvalId}/deny`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ confirmation: "DENY", reason })
                });
                if (!r.ok) { const p = await r.json(); throw new Error(p.error || "Deny failed"); }
                loadAgentHub();
            } catch (e) { alert("Deny failed: " + e.message); }
        };

        const contentReview = workspace.querySelector("#contentReviewWebsite");
        if (contentReview) contentReview.onclick = () => alert("Website review coming soon — will analyze prospect websites for quality, mobile-friendliness, and brand consistency.");

        const contentSocial = workspace.querySelector("#contentGenerateSocial");
        if (contentSocial) contentSocial.onclick = () => alert("Social content generation coming soon — will create platform-specific posts for LinkedIn, Instagram, and Facebook.");

        const contentPrint = workspace.querySelector("#contentGeneratePrint");
        if (contentPrint) contentPrint.onclick = () => alert("Print ad generation coming soon — will create Well Noticed print ad layouts from prospect data.");

        workspace.querySelectorAll("[data-avo-accept]").forEach(btn => {
            btn.onclick = async () => {
                if (!(await ensureAuth())) { alert("Session expired."); return loadAgentHub(); }
                btn.disabled = true;
                try {
                    await authFetch(`/api/venture-agent/candidates/${btn.dataset.avoAccept}/decision`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ decision: "accepted", confirmation: "ACCEPT OPPORTUNITY" })
                    });
                    loadAgentHub();
                } catch (e) { alert(e.message); btn.disabled = false; }
            };
        });

        workspace.querySelectorAll("[data-avo-reject]").forEach(btn => {
            btn.onclick = async () => {
                if (!(await ensureAuth())) { alert("Session expired."); return loadAgentHub(); }
                btn.disabled = true;
                try {
                    await authFetch(`/api/venture-agent/candidates/${btn.dataset.avoReject}/decision`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ decision: "rejected", confirmation: "REJECT OPPORTUNITY" })
                    });
                    loadAgentHub();
                } catch (e) { alert(e.message); btn.disabled = false; }
            };
        });
    }

    window.loadAgentHub = loadAgentHub;
}());
