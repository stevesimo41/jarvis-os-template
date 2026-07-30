(function () {
    "use strict";

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

    let attentionState = { loading: false, tasks: [], enrichment: [], expanded: false };

    async function loadAttentionItems() {
        attentionState.loading = true;
        try {
            const [tasksRes, enrichRes] = await Promise.all([
                authFetch("/api/cadence-review/tasks"),
                authFetch("/api/cadence-review/enrichment")
            ]);
            const tasksData = tasksRes.ok ? await tasksRes.json() : null;
            const enrichData = enrichRes.ok ? await enrichRes.json() : null;
            attentionState.tasks = (tasksData?.data?.tasks || []).filter(t => t.status === "pending");
            attentionState.enrichment = (enrichData?.data?.suggestions || []).filter(s => !s.applied && (s.suggestedName || s.suggestedEmail));
        } catch (_e) {
            attentionState.tasks = [];
            attentionState.enrichment = [];
        }
        attentionState.loading = false;
    }

    function totalItems() {
        return attentionState.tasks.length + attentionState.enrichment.length;
    }

    function renderBanner() {
        const count = totalItems();
        if (count === 0 && !attentionState.loading) return "";

        const dotClass = count > 0 ? "background:var(--yellow)" : "background:var(--green)";
        const expandIcon = attentionState.expanded ? "\u25B2" : "\u25BC";

        let html = '<div class="cr-attention-banner">';
        html += '<div class="cr-attention-header" onclick="window.CrmAttention.toggle()">';
        html += '<div class="cr-attention-dot" style="' + dotClass + '"></div>';
        if (attentionState.loading) {
            html += '<span class="cr-attention-title">Loading review items...</span>';
        } else if (count === 0) {
            html += '<span class="cr-attention-title">All cadences reviewed</span>';
        } else {
            html += '<span class="cr-attention-title">' + count + ' item' + (count > 1 ? 's' : '') + ' need attention</span>';
            if (attentionState.tasks.length > 0) {
                html += '<span class="cr-attention-badge cr-attention-badge-warn">' + attentionState.tasks.length + ' review</span>';
            }
            if (attentionState.enrichment.length > 0) {
                html += '<span class="cr-attention-badge cr-attention-badge-info">' + attentionState.enrichment.length + ' enrichment</span>';
            }
            html += '<span class="cr-attention-toggle">' + expandIcon + '</span>';
        }
        html += '</div>';

        if (attentionState.expanded && count > 0) {
            html += '<div class="cr-attention-list">';

            for (const task of attentionState.tasks) {
                html += '<div class="cr-attention-item cr-attention-item-review">';
                html += '<div class="cr-attention-item-main">';
                html += '<strong>' + esc(task.companyName) + '</strong>';
                html += '<span class="cr-attention-item-note">' + esc(task.notes || "") + '</span>';
                html += '</div>';
                html += '<div class="cr-attention-item-actions">';
                html += '<button class="cr-attention-btn cr-attention-btn-open" onclick="window.CrmAttention.openInCrm(\'' + esc(task.companyName) + '\')">Open in CRM</button>';
                html += '<button class="cr-attention-btn cr-attention-btn-dismiss" onclick="window.CrmAttention.dismissTask(\'' + esc(task.id) + '\', this)">Dismiss</button>';
                html += '</div>';
                html += '</div>';
            }

            for (const s of attentionState.enrichment) {
                html += '<div class="cr-attention-item cr-attention-item-enrich">';
                html += '<div class="cr-attention-item-main">';
                html += '<strong>' + esc(s.company) + '</strong>';
                if (s.suggestedName) html += '<span class="cr-attention-item-detail" style="color:var(--blue-bright)">Name: ' + esc(s.suggestedName) + '</span>';
                if (s.suggestedEmail) html += '<span class="cr-attention-item-detail" style="color:var(--green)">Email: ' + esc(s.suggestedEmail) + '</span>';
                html += '</div>';
                html += '<div class="cr-attention-item-actions">';
                if (s.campaignId) {
                    html += '<button class="cr-attention-btn cr-attention-btn-apply" onclick="window.CrmAttention.applyEnrichment(\'' + esc(s.campaignId) + '\',\'' + esc(s.suggestedName || '') + '\',\'' + esc(s.suggestedEmail || '') + '\', this)">Apply & Open</button>';
                }
                html += '<button class="cr-attention-btn cr-attention-btn-dismiss" onclick="window.CrmAttention.dismissEnrichment(this)">Dismiss</button>';
                html += '</div>';
                html += '</div>';
            }

            html += '</div>';
        }

        html += '</div>';
        return html;
    }

    function toggleExpand() {
        attentionState.expanded = !attentionState.expanded;
        // Re-render just the banner — caller should re-render the full CRM after
        const bannerEl = document.getElementById("crm-attention-container");
        if (bannerEl) bannerEl.innerHTML = renderBanner();
    }

    function openInCrm(companyName) {
        // Find the prospect in CRM records by company name and select it
        const state = window.JarvisCrmState?.state;
        if (!state || !state.records) return;

        const searchName = companyName.toLowerCase();
        const match = state.records.find(r => {
            const rName = (r["Company Name"] || r.name || r.company || "").toLowerCase();
            return rName.includes(searchName) || searchName.includes(rName);
        });

        if (match) {
            // Select the prospect — this triggers intelligence + governance load
            const idx = state.records.indexOf(match);
            state.selectedProspect = match;

            // Scroll the table row into view
            setTimeout(() => {
                const rows = document.querySelectorAll(".jarvis-crm-selectable-row");
                if (rows[idx]) {
                    rows[idx].classList.add("is-selected");
                    rows[idx].scrollIntoView({ behavior: "smooth", block: "center" });
                }
                // Trigger re-render to show governance panel
                if (window.JarvisCrmWorkspace?.render) window.JarvisCrmWorkspace.render();
            }, 100);
        } else {
            alert("Company not found in current CRM view. Try expanding the page size or clearing filters.");
        }
    }

    async function dismissTask(taskId, btn) {
        try {
            await authFetch("/api/cadence-review/tasks/" + taskId + "/complete", {
                method: "POST",
                body: JSON.stringify({ action: "skipped" })
            });
            attentionState.tasks = attentionState.tasks.filter(t => t.id !== taskId);
            const container = document.getElementById("crm-attention-container");
            if (container) container.innerHTML = renderBanner();
        } catch (_e) {}
    }

    async function applyEnrichment(campaignId, name, email, btn) {
        try {
            const res = await authFetch("/api/cadence-review/enrichment/apply", {
                method: "POST",
                body: JSON.stringify({ campaignId, name: name || undefined, email: email || undefined })
            });
            if (res.ok) {
                attentionState.enrichment = attentionState.enrichment.filter(s => s.campaignId !== campaignId);
                const container = document.getElementById("crm-attention-container");
                if (container) container.innerHTML = renderBanner();
                // Now open the campaign in CRM
                openInCrm(name || campaignId);
            }
        } catch (_e) {}
    }

    function dismissEnrichment(btn) {
        const item = btn.closest(".cr-attention-item");
        if (item) {
            const companyName = item.querySelector("strong")?.textContent;
            attentionState.enrichment = attentionState.enrichment.filter(s => s.company !== companyName);
            item.style.opacity = "0.3";
            setTimeout(() => {
                const container = document.getElementById("crm-attention-container");
                if (container) container.innerHTML = renderBanner();
            }, 300);
        }
    }

    window.CrmAttention = {
        load: loadAttentionItems,
        render: renderBanner,
        toggle: toggleExpand,
        openInCrm,
        dismissTask,
        applyEnrichment,
        dismissEnrichment,
        state: attentionState
    };
})();
