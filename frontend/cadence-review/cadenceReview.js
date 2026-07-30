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

    const priorityColors = { high: "#ef4444", medium: "#f59e0b", low: "#22c55e" };
    const statusColors = { pending: "#f59e0b", approved: "#22c55e", skipped: "#64748b", edited: "#3b82f6" };
    const confidenceColors = { high: "var(--green)", medium: "var(--blue-bright)", low: "var(--muted)" };

    const stepChannelIcons = {
        "email": "\u2709",
        "website-contact-form": "\u2302",
        "linkedin": "\u2B21"
    };
    const stepStatusColors = {
        "pending": "var(--muted)",
        "ready": "var(--blue-bright)",
        "completed": "var(--green)",
        "skipped": "#64748b",
        "failed": "#ef4444",
        "needs-manual": "var(--yellow)"
    };

    async function loadCadenceReview() {
        const container = document.getElementById("dashboardRoot");
        if (!container) return;

        container.innerHTML = '<div class="command-center-loading"><div class="loading-pulse"></div><span>Loading cadence review...</span></div>';

        try {
            const [tasksRes, enrichmentRes] = await Promise.all([
                authFetch("/api/cadence-review/tasks"),
                authFetch("/api/cadence-review/enrichment")
            ]);

            const tasksData = tasksRes.ok ? await tasksRes.json() : null;
            const enrichData = enrichmentRes.ok ? await enrichmentRes.json() : null;

            const tasks = tasksData?.data?.tasks || [];
            const enrichment = enrichData?.data?.suggestions || [];

            const pending = tasks.filter(t => t.status === "pending");
            const completed = tasks.filter(t => t.status !== "pending");
            const unappliedEnrichment = enrichment.filter(s => !s.applied && (s.suggestedName || s.suggestedEmail));

            let html = '<div class="module-shell">';

            // Header
            html += '<section class="command-hero"><div class="command-hero-main">';
            html += '<div class="eyebrow">JARVIS OS / CADENCE REVIEW</div>';
            html += '<h1>Cadence Review</h1>';
            html += '<p>' + pending.length + ' pending tasks · ' + unappliedEnrichment.length + ' enrichment suggestions · Preview each campaign before approving.</p>';
            html += '</div></section>';

            html += '<div style="padding:0 20px">';

            // Enrichment suggestions section
            if (unappliedEnrichment.length > 0) {
                html += '<div class="section-label" style="margin-bottom:12px">ENRICHMENT SUGGESTIONS (' + unappliedEnrichment.length + ')</div>';
                html += '<div id="enrichmentList">';

                for (const s of unappliedEnrichment) {
                    const confColor = confidenceColors[s.confidence] || "var(--muted)";
                    html += '<div class="activity-item" id="enrich-' + esc(s.campaignId || s.company) + '" style="flex-direction:column;align-items:flex-start;padding:16px;border:1px solid rgba(77,163,255,.15);border-radius:8px;background:rgba(77,163,255,.03);margin-bottom:8px">';
                    html += '<div style="display:flex;justify-content:space-between;width:100%;margin-bottom:8px">';
                    html += '<strong style="color:#e2e8f0">' + esc(s.company) + '</strong>';
                    html += '<span style="font-size:11px;padding:2px 8px;border-radius:4px;background:' + confColor + '22;color:' + confColor + '">' + esc(s.confidence) + ' confidence</span>';
                    html += '</div>';
                    if (s.suggestedName) {
                        html += '<div style="font-size:12px;color:var(--blue-bright);margin-bottom:4px">\uD83D\uDC64 Name: <strong>' + esc(s.suggestedName) + '</strong>' + (s.executiveTitle ? ' (' + esc(s.executiveTitle) + ')' : '') + '</div>';
                    }
                    if (s.suggestedEmail) {
                        html += '<div style="font-size:12px;color:var(--green);margin-bottom:4px">\u2709 Email: <strong>' + esc(s.suggestedEmail) + '</strong></div>';
                    }
                    html += '<div style="display:flex;gap:8px">';
                    if (s.campaignId && (s.suggestedName || s.suggestedEmail)) {
                        html += '<button onclick="enrichmentApply(\'' + esc(s.campaignId) + '\',\'' + esc(s.suggestedName || '') + '\',\'' + esc(s.suggestedEmail || '') + '\')" style="font-size:11px;padding:4px 10px;border:1px solid var(--green);border-radius:4px;background:rgba(49,208,124,.08);color:var(--green);cursor:pointer">Apply to Campaign</button>';
                    }
                    html += '<button onclick="enrichmentDismiss(this)" style="font-size:11px;padding:4px 10px;border:1px solid var(--border-light);border-radius:4px;background:var(--panel-light);color:var(--muted);cursor:pointer">Dismiss</button>';
                    html += '</div></div>';
                }
                html += '</div>';
            }

            // Pending review tasks
            if (pending.length === 0) {
                html += '<div class="activity-item" style="padding:20px;border:1px solid var(--border);border-radius:8px;background:rgba(13,17,24,.9)">';
                html += '<span class="activity-dot" style="background:var(--green)"></span>';
                html += '<span class="activity-text">All clear \u2014 no pending review tasks</span>';
                html += '</div>';
            } else {
                html += '<div class="section-label" style="margin:20px 0 12px">PENDING REVIEW (' + pending.length + ')</div>';
                html += '<div id="cadenceReviewList">';

                for (const task of pending) {
                    const pColor = priorityColors[task.priority] || "#94a3b8";
                    html += '<div class="cr-task" id="task-' + esc(task.id) + '">';
                    html += '<div class="cr-task-header">';
                    html += '<div class="cr-task-title">';
                    html += '<strong style="color:var(--text)">' + esc(task.companyName) + '</strong>';
                    html += '<span class="scheduler-status-badge ' + (task.priority === "high" ? "error" : task.priority === "low" ? "active" : "") + '" style="background:' + pColor + '15;color:' + pColor + '">' + esc(task.priority) + '</span>';
                    html += '</div>';
                    html += '<div style="font-size:12px;color:var(--muted)">' + esc(task.email || "no email") + ' \u00B7 Score ' + (task.score || "\u2014") + '</div>';
                    html += '<div style="font-size:12px;color:var(--muted)">' + esc(task.notes || "") + '</div>';
                    html += '</div>';

                    // Action buttons
                    html += '<div class="cr-task-actions">';
                    html += '<button class="cr-btn cr-btn-detail" onclick="toggleCampaignDetail(\'' + esc(task.cadenceId) + '\', this)">Preview Campaign</button>';
                    html += '<button class="cr-btn cr-btn-approve" onclick="cadenceReviewAction(\'' + esc(task.id) + '\',\'approved\')">Approve</button>';
                    html += '<button class="cr-btn cr-btn-skip" onclick="cadenceReviewAction(\'' + esc(task.id) + '\',\'skipped\')">Skip</button>';
                    html += '</div>';

                    // Expandable detail area
                    html += '<div class="cr-detail-area" id="detail-' + esc(task.cadenceId) + '" style="display:none"></div>';

                    html += '</div>';
                }
                html += '</div>';
            }

            // Completed tasks
            if (completed.length) {
                html += '<div class="section-label" style="margin:20px 0 12px">COMPLETED (' + completed.length + ')</div>';
                html += '<div style="border:1px solid var(--border);border-radius:8px;overflow:hidden">';
                for (const task of completed.slice(0, 20)) {
                    const sColor = statusColors[task.status] || "#64748b";
                    html += '<div class="activity-item" style="border-bottom:1px solid var(--border);padding:10px 16px">';
                    html += '<span class="activity-dot" style="background:' + sColor + '"></span>';
                    html += '<span class="activity-text">' + esc(task.companyName) + ' \u2014 ' + esc(task.status) + '</span>';
                    html += '<span class="activity-time">' + timeAgo(task.completedAt) + '</span>';
                    html += '</div>';
                }
                html += '</div>';
            }

            html += '</div></div>';
            container.innerHTML = html;

        } catch (err) {
            container.innerHTML = '<div class="command-center-loading"><div class="eyebrow">ERROR</div><h2>Failed to load cadence review</h2><p>' + esc(err.message) + '</p></div>';
        }
    }

    window.toggleCampaignDetail = async function (campaignId, btn) {
        const area = document.getElementById("detail-" + campaignId);
        if (!area) return;

        // Toggle closed
        if (area.style.display !== "none") {
            area.style.display = "none";
            btn.textContent = "Preview Campaign";
            return;
        }

        // Open and load
        area.style.display = "block";
        area.innerHTML = '<div style="padding:16px;color:var(--muted);font-size:12px">Loading campaign details...</div>';
        btn.textContent = "Hide Preview";

        try {
            const res = await authFetch("/api/cadence-review/campaign/" + campaignId);
            const data = res.ok ? await res.json() : null;
            const campaign = data?.data;
            if (!campaign) {
                area.innerHTML = '<div style="padding:16px;color:#ef4444;font-size:12px">Campaign not found</div>';
                return;
            }

            let html = '<div class="cr-campaign-detail">';

            // Campaign summary
            html += '<div class="cr-detail-summary">';
            html += '<div class="cr-detail-row"><span class="cr-detail-label">Company</span><span>' + esc(campaign.prospectName) + '</span></div>';
            html += '<div class="cr-detail-row"><span class="cr-detail-label">Executive</span><span>' + esc(campaign.executiveName || "Not found") + '</span></div>';
            html += '<div class="cr-detail-row"><span class="cr-detail-label">Email</span><span>' + esc(campaign.executiveEmail || "None") + '</span></div>';
            html += '<div class="cr-detail-row"><span class="cr-detail-label">Website</span><span>' + esc(campaign.website || "None") + '</span></div>';
            html += '<div class="cr-detail-row"><span class="cr-detail-label">Category</span><span>' + esc(campaign.category || "N/A") + '</span></div>';
            html += '<div class="cr-detail-row"><span class="cr-detail-label">Fit Score</span><span>' + (campaign.fitScore || "N/A") + '</span></div>';
            html += '<div class="cr-detail-row"><span class="cr-detail-label">Status</span><span>' + esc(campaign.status) + '</span></div>';
            html += '</div>';

            // Steps timeline
            if (campaign.steps && campaign.steps.length) {
                html += '<div class="cr-detail-section-label">CADENCE STEPS (' + campaign.steps.length + ')</div>';

                for (const step of campaign.steps) {
                    const chIcon = stepChannelIcons[step.channel] || "\u2022";
                    const stColor = stepStatusColors[step.status] || "var(--muted)";
                    const isEmail = step.channel === "email";

                    html += '<div class="cr-step">';
                    html += '<div class="cr-step-header">';
                    html += '<div class="cr-step-num" style="color:' + stColor + '">' + chIcon + ' ' + step.step + '</div>';
                    html += '<div class="cr-step-info">';
                    html += '<strong>' + esc(step.name || "Step " + step.step) + '</strong>';
                    html += '<span class="cr-step-meta">' + esc(step.channel) + ' \u00B7 Day ' + step.delayDays + '</span>';
                    html += '</div>';
                    html += '<span style="font-size:11px;padding:2px 8px;border-radius:4px;background:' + stColor + '15;color:' + stColor + '">' + esc(step.status) + '</span>';
                    html += '</div>';

                    if (isEmail && step.subject) {
                        html += '<div class="cr-step-subject"><strong>Subject:</strong> ' + esc(step.subject) + '</div>';
                    }
                    if (step.message) {
                        html += '<div class="cr-step-body">' + esc(step.message).replace(/\n/g, '<br>') + '</div>';
                    }
                    if (step.notes) {
                        html += '<div class="cr-step-notes">' + esc(step.notes) + '</div>';
                    }
                    if (step.executedAt) {
                        html += '<div class="cr-step-time">Sent ' + timeAgo(step.executedAt) + (step.emailResult?.messageId ? ' \u00B7 ID: ' + esc(step.emailResult.messageId.substring(0, 20)) : '') + '</div>';
                    }
                    html += '</div>';
                }
            }

            html += '</div>';
            area.innerHTML = html;

        } catch (err) {
            area.innerHTML = '<div style="padding:16px;color:#ef4444;font-size:12px">Error: ' + esc(err.message) + '</div>';
        }
    };

    window.cadenceReviewAction = async function (taskId, action) {
        try {
            const res = await authFetch("/api/cadence-review/tasks/" + taskId + "/complete", {
                method: "POST",
                body: JSON.stringify({ action })
            });
            const data = await res.json();
            if (data.ok) {
                const el = document.getElementById("task-" + taskId);
                if (el) {
                    el.style.opacity = "0.3";
                    el.style.transition = "opacity 0.3s";
                    setTimeout(() => { el.remove(); loadCadenceReview(); }, 300);
                }
            } else {
                alert("Error: " + (data.error || "unknown"));
            }
        } catch (e) {
            alert("Action failed: " + e.message);
        }
    };

    window.enrichmentApply = async function (campaignId, name, email) {
        try {
            const res = await authFetch("/api/cadence-review/enrichment/apply", {
                method: "POST",
                body: JSON.stringify({ campaignId, name: name || undefined, email: email || undefined })
            });
            const data = await res.json();
            if (data.ok) {
                const el = document.getElementById("enrich-" + campaignId);
                if (el) { el.style.opacity = "0.3"; setTimeout(() => el.remove(), 300); }
            } else {
                alert("Error: " + (data.error || "unknown"));
            }
        } catch (e) {
            alert("Apply failed: " + e.message);
        }
    };

    window.enrichmentDismiss = function (btn) {
        const card = btn.closest(".activity-item");
        if (card) { card.style.opacity = "0.3"; setTimeout(() => card.remove(), 300); }
    };

    window.loadCadenceReview = loadCadenceReview;
})();
