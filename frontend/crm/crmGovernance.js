(function () {
    "use strict";

    const TOKEN_KEY = "jarvis.localAuthToken";

    function escapeHtml(value) {
        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    function token() {
        return window.sessionStorage.getItem(TOKEN_KEY) || "";
    }

    async function request(url, options = {}, authenticated = false) {
        const headers = {
            Accept: "application/json",
            ...(options.body ? { "Content-Type": "application/json" } : {}),
            ...(options.headers || {})
        };

        if (authenticated) {
            const activeToken = token();
            if (activeToken) headers.Authorization = `Bearer ${activeToken}`;
        }

        const response = await fetch(url, { ...options, headers });
        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(
                payload?.error?.message ||
                payload?.error ||
                payload?.message ||
                `Request failed with status ${response.status}`
            );
        }

        return payload;
    }

    function organizationContext(prospect) {
        return {
            ventureId: prospect?.ventureId || "well-noticed",
            organizationId: prospect?.id || prospect?.name || prospect?.["Company Name"] || "unknown"
        };
    }

    async function loadAuthStatus(governance) {
        const payload = await request("/api/auth/status");
        governance.authStatus = payload.data.authentication;

        try {
            governance.identity = (
                await request("/api/auth/me", {}, true)
            ).data.identity;
        } catch {
            window.sessionStorage.removeItem(TOKEN_KEY);
            governance.identity = null;
        }
    }

    function renderConnection(governance) {
        if (governance.identity) {
            return `
                <div class="jarvis-crm-governance-identity">
                    <div>
                        <span>Authenticated as</span>
                        <strong>${escapeHtml(governance.identity.name)}</strong>
                        <small>${escapeHtml(governance.identity.role)}</small>
                    </div>
                    <button id="jarvis-governance-disconnect" class="jarvis-crm-button" type="button">
                        Disconnect
                    </button>
                </div>
            `;
        }

        const configured = governance.authStatus?.configured;
        const valid = governance.authStatus?.valid;

        return `
            <div class="jarvis-crm-governance-connect">
                <label>
                    <span>Local demo token</span>
                    <input
                        id="jarvis-governance-token"
                        type="password"
                        autocomplete="off"
                        placeholder="Paste owner token"
                    >
                </label>
                <button id="jarvis-governance-connect" class="jarvis-crm-button is-primary" type="button">
                    Connect
                </button>
                <small>
                    ${
                        configured && valid
                    ? "Authentication is ready. The pasted token is exchanged for a protected session cookie."
                            : "Add valid JARVIS role tokens to backend/.env, then restart."
                    }
                </small>
            </div>
        `;
    }

    function renderPlan(governance) {
        const plan = governance.plan?.result;

        if (!plan) {
            return "";
        }

        return `
            <div class="jarvis-crm-governance-result">
                <span>Recommended action</span>
                <strong>${escapeHtml(plan.decision?.action || "No action")}</strong>
                <p>${escapeHtml(plan.decision?.reason || "")}</p>
            </div>
        `;
    }

    function renderApproval(governance) {
        const approval = governance.approval;

        if (!approval) {
            return "";
        }

        return `
            <div class="jarvis-crm-governance-result">
                <span>Approval</span>
                <strong>${escapeHtml(approval.status)}</strong>
                <p>
                    ${escapeHtml(approval.action)} · expires
                    ${escapeHtml(new Date(approval.expiresAt).toLocaleTimeString())}
                </p>
            </div>
        `;
    }

    function renderExecution(governance) {
        const result = governance.execution;

        if (!result) {
            return "";
        }

        return `
            <div class="jarvis-crm-governance-result is-success">
                <span>Execution complete</span>
                <strong>${escapeHtml(result.task?.title)}</strong>
                <p>Internal task created. No external action occurred.</p>
            </div>
        `;
    }

    function renderAudit(governance) {
        if (!governance.auditEvents.length) {
            return "";
        }

        return `
            <div class="jarvis-crm-governance-audit">
                <span>Recent governance events</span>
                ${governance.auditEvents.slice(0, 5).map(event => `
                    <div>
                        <strong>${escapeHtml(event.event.replaceAll("_", " "))}</strong>
                        <small>${escapeHtml(new Date(event.timestamp).toLocaleTimeString())}</small>
                    </div>
                `).join("")}
            </div>
        `;
    }

    function isCampaignReady(prospect) {
        const name = prospect.name || prospect["Company Name"] || prospect.Company;
        const website = prospect.website || prospect.Website || prospect.URL;
        const email = prospect.email || prospect.EMAIL;
        return Boolean(name && (website || email));
    }

    function renderDataCompleteness(prospect) {
        const fields = [
            { label: "Company", value: prospect.name || prospect["Company Name"] || prospect.Company },
            { label: "Website", value: prospect.website || prospect.Website || prospect.URL },
            { label: "Email", value: prospect.email || prospect.EMAIL },
            { label: "Contact", value: prospect.contact || prospect["Main Contact"] || prospect["Contact Name"] },
            { label: "Phone", value: prospect.phone || prospect.Phone || prospect.PHONE },
            { label: "City", value: prospect.city || prospect.City }
        ];
        const filled = fields.filter(f => f.value && String(f.value).trim()).length;
        const total = fields.length;
        const pct = Math.round((filled / total) * 100);
        const missing = fields.filter(f => !f.value || !String(f.value).trim()).map(f => f.label);

        if (pct === 100) {
            return `<div class="jarvis-crm-data-complete"><span class="jarvis-crm-data-pct">${pct}%</span> All fields populated — ready for campaign</div>`;
        }

        return `
            <div class="jarvis-crm-data-partial">
                <div class="jarvis-crm-data-bar"><div class="jarvis-crm-data-fill" style="width:${pct}%"></div></div>
                <span class="jarvis-crm-data-pct">${pct}%</span>
                <span class="jarvis-crm-data-missing">Missing: ${missing.join(", ")}</span>
            </div>
        `;
    }

    function render(prospect, governance) {
        const hasOrganization = Boolean(prospect?.id || prospect?.name || prospect?.["Company Name"]);
        const approved = governance.approval?.status === "approved";

        return `
            <section class="jarvis-crm-governance">
                <div class="jarvis-crm-governance-heading">
                    <div>
                        <span>GOVERNED ACTIONS</span>
                        <strong>Approval Command Center</strong>
                    </div>
                    <span class="jarvis-crm-governance-shield">HUMAN CONTROL</span>
                </div>

                ${renderConnection(governance)}

                ${
                    hasOrganization
                        ? `
                            <div class="jarvis-crm-governance-target">
                                <span>Selected organization</span>
                                <strong>${escapeHtml(prospect.name || prospect["Company Name"] || prospect.id || "Unknown")}</strong>
                            </div>
                            ${renderDataCompleteness(prospect)}
                            <div class="jarvis-crm-governance-actions">
                                <button id="jarvis-governance-plan" class="jarvis-crm-button" type="button">Plan action</button>
                                <button id="jarvis-governance-request" class="jarvis-crm-button" type="button">Request approval</button>
                                <button id="jarvis-governance-approve" class="jarvis-crm-button" type="button" ${governance.approval?.status !== "pending" ? "disabled" : ""}>Approve</button>
                                <button id="jarvis-governance-execute" class="jarvis-crm-button is-primary" type="button" ${!approved ? "disabled" : ""}>Create task</button>
                                <button id="jarvis-governance-enrich" class="jarvis-crm-button is-enrich" type="button">Enrich Data</button>
                                <button id="jarvis-governance-campaign" class="jarvis-crm-button is-campaign" type="button" ${!isCampaignReady(prospect) ? 'disabled title="Enrich data first"' : ''}>Add to Campaign</button>
                                <button id="jarvis-governance-audit" class="jarvis-crm-button" type="button">View audit</button>
                            </div>
                        `
                        : `
                            <div class="jarvis-crm-governance-placeholder">
                                Select a prospect from the table to view actions and campaign options.
                            </div>
                        `
                }

                ${governance.loading ? '<div class="jarvis-crm-governance-note">Working...</div>' : ""}
                ${governance.message ? `<div class="jarvis-crm-governance-note is-success">${escapeHtml(governance.message)}</div>` : ""}
                ${governance.error ? `<div class="jarvis-crm-governance-note is-error">${escapeHtml(governance.error)}</div>` : ""}
                ${renderPlan(governance)}
                ${renderApproval(governance)}
                ${renderExecution(governance)}
                ${renderAudit(governance)}
            </section>
            <div id="jarvis-campaign-modal" class="jarvis-campaign-modal" ${governance.campaignPreview ? 'style="display:flex;"' : 'style="display:none;"'}>
                <div class="jarvis-campaign-modal-backdrop"></div>
                <div class="jarvis-campaign-modal-content">
                    <div class="jarvis-campaign-modal-header">
                        <h3>${governance.campaignPreview?.existingCampaignId ? "Campaign Details" : "Campaign Preview"}</h3>
                        <button id="jarvis-campaign-modal-close" class="jarvis-campaign-modal-close-btn">&times;</button>
                    </div>
                    <div id="jarvis-campaign-modal-body" class="jarvis-campaign-modal-body"></div>
                    <div class="jarvis-campaign-modal-footer">
                        <button id="jarvis-campaign-cancel" class="jarvis-crm-button" type="button">Close</button>
                        <button id="jarvis-campaign-confirm" class="jarvis-crm-button is-campaign" type="button">${governance.campaignPreview?.existingCampaignId ? "Save Edits" : "Confirm & Launch Campaign"}</button>
                    </div>
                </div>
            </div>
        `;
    }

    function bind(prospect, governance, rerender) {
        async function run(operation) {
            governance.loading = true;
            governance.error = "";
            governance.message = "";
            rerender();

            try {
                await operation();
            } catch (error) {
                governance.error = error?.message || "Governed action failed.";
            } finally {
                governance.loading = false;
                rerender();
            }
        }

        document.getElementById("jarvis-governance-connect")?.addEventListener("click", () => {
            const value = document.getElementById("jarvis-governance-token")?.value.trim();

            return run(async () => {
                if (!value) {
                    throw new Error("Paste a local owner or operator token.");
                }
                window.sessionStorage.setItem(TOKEN_KEY, value);
                try {
                    const session = await request("/api/auth/session", {
                        method: "POST",
                        headers: { Authorization: `Bearer ${value}` },
                        body: JSON.stringify({ deviceName: "CRM Command Center" })
                    });
                    window.sessionStorage.removeItem(TOKEN_KEY);
                    governance.identity = session.data.identity;
                    governance.message = `Connected as ${governance.identity.name}.`;
                } catch (error) {
                    window.sessionStorage.removeItem(TOKEN_KEY);
                    throw error;
                }
            });
        });

        document.getElementById("jarvis-governance-disconnect")?.addEventListener("click", () => {
            return run(async () => {
                await request("/api/auth/session", { method: "DELETE" }, true);
                window.sessionStorage.removeItem(TOKEN_KEY);
                governance.identity = null;
                governance.message = "Protected session disconnected.";
            });
        });

        const context = organizationContext(prospect);

        document.getElementById("jarvis-governance-plan")?.addEventListener("click", () => run(async () => {
            governance.plan = (
                await request("/api/crm/workflow/plan", {
                    method: "POST",
                    body: JSON.stringify(context)
                })
            ).data;
            governance.message = "Next action planned.";
        }));

        document.getElementById("jarvis-governance-request")?.addEventListener("click", () => run(async () => {
            governance.approval = (
                await request("/api/crm/workflow/approval/request", {
                    method: "POST",
                    body: JSON.stringify(context)
                }, true)
            ).data.approval;
            governance.message = "Approval requested.";
        }));

        document.getElementById("jarvis-governance-approve")?.addEventListener("click", () => run(async () => {
            governance.approval = (
                await request(`/api/crm/workflow/approval/${governance.approval.id}/approve`, {
                    method: "POST",
                    body: JSON.stringify({ confirmation: "APPROVE" })
                }, true)
            ).data.approval;
            governance.message = "Action approved.";
        }));

        document.getElementById("jarvis-governance-execute")?.addEventListener("click", () => run(async () => {
            governance.execution = (
                await request("/api/crm/workflow/execute", {
                    method: "POST",
                    body: JSON.stringify({
                        ...context,
                        approvalId: governance.approval.id
                    })
                }, true)
            ).data.result;
            governance.approval = governance.execution.approval;
            governance.message = "Approved internal task created.";
        }));

        document.getElementById("jarvis-governance-audit")?.addEventListener("click", () => run(async () => {
            governance.auditEvents = (
                await request("/api/crm/workflow/audit?limit=10", {}, true)
            ).data.events;
            governance.message = "Governance audit refreshed.";
        }));

        document.getElementById("jarvis-governance-enrich")?.addEventListener("click", async () => {
            const prospectName = prospect.name || prospect["Company Name"] || prospect.Company || "";
            const website = prospect.website || prospect.Website || prospect.URL || "";

            if (!prospectName) {
                governance.error = "No company name found to enrich.";
                rerender();
                return;
            }

            governance.loading = true;
            governance.message = "Researching company online...";
            governance.error = "";
            rerender();

            try {
                const enrichResult = await request("/api/crm/enrich", {
                    method: "POST",
                    body: JSON.stringify({ name: prospectName, website })
                });

                const data = enrichResult.data || {};
                let enrichedFields = [];

                if (data.email && !prospect.email) { prospect.email = data.email; enrichedFields.push("email: " + data.email); }
                if (data.phone && !prospect.phone) { prospect.phone = data.phone; enrichedFields.push("phone: " + data.phone); }
                if (data.executiveName && !prospect.executiveName) { prospect.executiveName = data.executiveName; enrichedFields.push("executive: " + data.executiveName); }
                if (data.executiveTitle) { prospect.executiveTitle = data.executiveTitle; enrichedFields.push("title: " + data.executiveTitle); }
                if (data.website && !prospect.website) { prospect.website = data.website; enrichedFields.push("website"); }
                if (data.googleReviewCount) { prospect.googleReviewCount = data.googleReviewCount; enrichedFields.push("reviews: " + data.googleReviewCount); }
                if (data.city && !prospect.city) { prospect.city = data.city; enrichedFields.push("city: " + data.city); }

                governance.message = enrichedFields.length > 0
                    ? `Found: ${enrichedFields.join(", ")}. You can now add to campaign.`
                    : "No additional data found online. You may need to add details manually.";
            } catch (error) {
                governance.error = error?.message || "Enrichment failed.";
            } finally {
                governance.loading = false;
                rerender();
            }
        });

        document.getElementById("jarvis-governance-campaign")?.addEventListener("click", async () => {
            const prospectName = prospect.name || prospect["Company Name"] || prospect.Company || "";
            const prospectCategory = prospect.category || prospect["Master-Category"] || prospect["Master Category"] || prospect.Category || "local-business";
            const prospectEmail = prospect.email || prospect.EMAIL || "";
            const prospectWebsite = prospect.website || prospect.Website || prospect.URL || "";
            const prospectCity = prospect.city || prospect.City || "Columbus";

            governance.loading = true;
            governance.error = "";
            governance.message = "Checking for existing campaign...";
            rerender();

            try {
                let existingCampaign = null;
                try {
                    const resp = await request(`/api/campaign-execute/by-company/${encodeURIComponent(prospectName)}`, {}, true);
                    existingCampaign = resp.data;
                } catch {}

                if (existingCampaign) {
                    const preview = {
                        prospect: {
                            name: existingCampaign.prospectName,
                            category: existingCampaign.category,
                            executiveName: existingCampaign.executiveName,
                            executiveEmail: existingCampaign.executiveEmail,
                            website: existingCampaign.website
                        },
                        steps: existingCampaign.steps.map(s => ({
                            step: s.step,
                            name: s.name,
                            channel: s.channel,
                            delayDays: s.delayDays,
                            subject: s.subject,
                            message: s.message || s.connectionNote,
                            status: s.status
                        })),
                        totalDurationDays: Math.max(...existingCampaign.steps.map(s => s.delayDays)),
                        existingCampaignId: existingCampaign.id,
                        existingCampaignStatus: existingCampaign.status
                    };
                    governance.campaignPreview = preview;
                    await showCampaignModal(preview);
                } else {
                    governance.message = "Loading campaign preview...";
                    rerender();
                    governance.campaignPreview = (
                        await request("/api/venture-operations/campaigns/preview", {
                            method: "POST",
                            body: JSON.stringify({
                                name: prospectName,
                                category: prospectCategory,
                                executiveName: prospect.executiveName || prospect.contact || prospect["Main Contact"] || prospect["Contact Name"] || "",
                                executiveEmail: prospect.executiveEmail || prospectEmail,
                                website: prospectWebsite,
                                googleReviewCount: prospect.googleReviewCount || "",
                                city: prospectCity,
                                specificStrength: prospect.specificStrength || ""
                            })
                        }, true)
                    ).data;
                    await showCampaignModal(governance.campaignPreview);
                }
            } catch (error) {
                governance.error = error?.message || "Failed to load preview.";
                rerender();
            } finally {
                governance.loading = false;
            }
        });

        document.getElementById("jarvis-campaign-modal-close")?.addEventListener("click", () => { hideCampaignModal(); governance.campaignPreview = null; });
        document.getElementById("jarvis-campaign-cancel")?.addEventListener("click", () => { hideCampaignModal(); governance.campaignPreview = null; });
        document.querySelector(".jarvis-campaign-modal-backdrop")?.addEventListener("click", () => { hideCampaignModal(); governance.campaignPreview = null; });

        document.getElementById("jarvis-campaign-confirm")?.addEventListener("click", () => run(async () => {
            const preview = governance.campaignPreview;
            if (!preview) throw new Error("No campaign preview loaded");

            const body = document.getElementById("jarvis-campaign-modal-body");
            if (body) {
                body.querySelectorAll(".jarvis-campaign-edit-field").forEach(el => {
                    const stepIdx = Number(el.dataset.step);
                    const field = el.dataset.field;
                    if (preview.steps[stepIdx]) {
                        if (field === "subject") preview.steps[stepIdx].subject = el.value;
                        if (field === "message") preview.steps[stepIdx].message = el.value;
                    }
                });
            }

            if (preview.existingCampaignId) {
                await request(`/api/campaign-execute/${preview.existingCampaignId}`, {
                    method: "PUT",
                    body: JSON.stringify({ steps: preview.steps })
                }, true);
                governance.message = `Campaign updated for ${preview.prospect.name}! Edits saved.`;
            } else {
                await request("/api/venture-operations/campaigns", {
                    method: "POST",
                    body: JSON.stringify({ ...preview.prospect, steps: preview.steps })
                }, true);
                governance.message = `Campaign launched for ${preview.prospect.name}! 5-touch cadence active.`;
            }

            hideCampaignModal();
            governance.campaignPreview = null;
        }));
    }

    async function showCampaignModal(preview) {
        const modal = document.getElementById("jarvis-campaign-modal");
        const body = document.getElementById("jarvis-campaign-modal-body");
        if (!modal || !body) return;

        const channelIcons = {
            "website-contact-form": "🌐",
            "email": "📧",
            "linkedin": "💼"
        };

        // Fetch tracking data for existing campaigns
        let trackingData = null;
        if (preview.existingCampaignId) {
            try {
                const trackResp = await fetch(`/api/tracking/campaign/${preview.existingCampaignId}`);
                const trackJson = await trackResp.json();
                if (trackJson.ok) {
                    trackingData = trackJson.data;
                }
            } catch (_e) { /* tracking fetch non-critical */ }
        }

        body.innerHTML = `
            ${preview.existingCampaignId ? `
                <div class="jarvis-campaign-existing-badge">
                    <span>Active Campaign</span>
                    <strong>${preview.existingCampaignId}</strong>
                </div>
            ` : ""}
            <div class="jarvis-campaign-prospect-info">
                <div class="jarvis-campaign-prospect-detail">
                    <span>Prospect</span>
                    <strong>${escapeHtml(preview.prospect.name)}</strong>
                </div>
                <div class="jarvis-campaign-prospect-detail">
                    <span>Category</span>
                    <strong>${escapeHtml(preview.prospect.category)}</strong>
                </div>
                <div class="jarvis-campaign-prospect-detail">
                    <span>Contact</span>
                    <strong>${escapeHtml(preview.prospect.executiveName || "Not specified")}</strong>
                </div>
                <div class="jarvis-campaign-prospect-detail">
                    <span>Duration</span>
                    <strong>${preview.totalDurationDays} days</strong>
                </div>
            </div>
            <div class="jarvis-campaign-steps-preview">
                <div class="jarvis-campaign-steps-header">
                    <h4>Cadence Steps</h4>
                    <button id="jarvis-campaign-edit-toggle" class="jarvis-crm-button is-edit" type="button">Edit Messages</button>
                </div>
                ${preview.steps.map((step, i) => {
                    const statusClass = step.status === "completed" ? "is-completed" : step.status === "ready" ? "is-ready" : "";
                    const statusLabel = step.status === "completed" ? "Sent" : step.status === "ready" ? "Ready" : "Pending";
                    // Look up tracking for this step
                    const stepTracking = trackingData?.mappings?.find(m => m.stepNumber === step.step || m.stepNumber === i + 1);
                    const opens = stepTracking?.openCount || 0;
                    const clicks = stepTracking?.clickCount || 0;
                    const trackingHtml = opens > 0 || clicks > 0
                        ? `<small class="jarvis-campaign-tracking-stats">👁 ${opens} · 🔗 ${clicks}</small>`
                        : (step.status === "completed" ? `<small class="jarvis-campaign-tracking-stats is-pending">No opens yet</small>` : "");
                    return `
                    <div class="jarvis-campaign-step-card ${statusClass}">
                        <div class="jarvis-campaign-step-header">
                            <span class="jarvis-campaign-step-icon">${channelIcons[step.channel] || "📩"}</span>
                            <div class="jarvis-campaign-step-meta">
                                <strong>Step ${step.step}: ${escapeHtml(step.name)}</strong>
                                <small>${step.delayDays === 0 ? "Today" : `Day ${step.delayDays}`} · ${escapeHtml(step.channel)} · <span class="jarvis-campaign-step-status ${statusClass}">${statusLabel}</span> ${trackingHtml}</small>
                            </div>
                        </div>
                        ${step.subject ? `
                            <div class="jarvis-campaign-step-subject">
                                <span>Subject:</span>
                                <span class="jarvis-campaign-view-field">${escapeHtml(step.subject)}</span>
                                <input class="jarvis-campaign-edit-field" type="text" value="${escapeHtml(step.subject)}" data-step="${i}" data-field="subject" style="display:none;">
                            </div>
                        ` : ""}
                        <div class="jarvis-campaign-step-body">
                            <span class="jarvis-campaign-view-field">${escapeHtml(step.message || step.connectionNote || "")}</span>
                            <textarea class="jarvis-campaign-edit-field" data-step="${i}" data-field="message" rows="8" style="display:none;">${escapeHtml(step.message || step.connectionNote || "")}</textarea>
                        </div>
                    </div>
                `;
                }).join("")}
            </div>
            <div class="jarvis-campaign-qr-note">
                <span>📊</span>
                <span>Each partner receives a unique QR code for measurable, traceable results against the mail audience.</span>
            </div>
            ${!preview.prospect.executiveName ? `
                <div class="jarvis-campaign-enrich-note">
                    <span>⚠️</span>
                    <span><strong>No decision maker found.</strong> Cadence will use company-level messaging. Click "Enrich Data" in the governance panel to find the owner, then preview again for fully personalized executive outreach.</span>
                </div>
            ` : ""}
        `;

        let editing = false;
        document.getElementById("jarvis-campaign-edit-toggle")?.addEventListener("click", () => {
            editing = !editing;
            const btn = document.getElementById("jarvis-campaign-edit-toggle");
            btn.textContent = editing ? "Done Editing" : "Edit Messages";
            btn.classList.toggle("is-editing", editing);

            body.querySelectorAll(".jarvis-campaign-edit-field").forEach(el => {
                el.style.display = editing ? "block" : "none";
            });
            body.querySelectorAll(".jarvis-campaign-view-field").forEach(el => {
                el.style.display = editing ? "none" : "inline";
            });
        });

        modal.style.display = "flex";
    }

    function hideCampaignModal() {
        const modal = document.getElementById("jarvis-campaign-modal");
        if (modal) modal.style.display = "none";
    }

    window.JarvisCrmGovernance = {
        loadAuthStatus,
        render,
        bind
    };
})();
