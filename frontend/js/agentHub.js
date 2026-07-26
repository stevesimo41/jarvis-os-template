/* =============================================
   JARVIS OS TEMPLATE — AGENT HUB
   Simplified: Market Pulse, CRM (generic), Approvals
   ============================================= */

(function () {
    "use strict";

    var esc = function (value) {
        var node = document.createElement("div");
        node.textContent = String(value ?? "");
        return node.innerHTML;
    };

    /* ---- Auth delegation ---- */

    function authFetch(url, opts) {
        if (window.JarvisAuth && window.JarvisAuth.authFetch) {
            return window.JarvisAuth.authFetch(url, opts);
        }
        return fetch(url, Object.assign({ credentials: "include" }, opts || {}));
    }

    async function ensureAuth() {
        if (window.JarvisAuth && window.JarvisAuth.ensureAuth) {
            return window.JarvisAuth.ensureAuth();
        }
        return true;
    }

    async function createSession(token) {
        if (window.JarvisAuth && window.JarvisAuth.createSession) {
            return window.JarvisAuth.createSession(token);
        }
        throw new Error("Auth module not loaded");
    }

    /* ---- Panel: Market Pulse ---- */

    function marketPulsePanel(data) {
        var pulse = data.marketPulse || {};
        var findings = pulse.findings || [];
        var lastRun = pulse.lastRunAt;

        return '<div class="mp-overview">' +
            '<article class="wn-header-card">' +
                '<span>SUPERVISED \u00b7 ACTIVE</span>' +
                '<h2>Market Pulse Agent</h2>' +
                '<p>Scans the web for business opportunities matching your target market in your area.</p>' +
            '</article>' +
            '<div class="wn-metrics">' +
                '<article><small>FINDINGS</small><strong>' + findings.length + '</strong></article>' +
                '<article><small>LAST SCAN</small><strong>' + (lastRun ? new Date(lastRun).toLocaleDateString() : "Never") + '</strong></article>' +
            '</div>' +
            '<button class="btn btn-primary" id="runMarketPulseScan">Scan Market Now</button>' +
            (findings.length > 0 ?
                '<article><h3 style="color:#79e6ba;margin:0 0 12px">Recent Findings</h3><div class="mp-findings-list">' +
                findings.slice(0, 8).map(function (f) {
                    return '<div class="mp-finding-row"><div><strong>' + esc(f.title || f.name || "Unknown") + '</strong><small>' + esc(f.category || f.source || "") + '</small></div><small>' + esc(f.score || "") + '</small></div>';
                }).join("") +
                '</div></article>' : '') +
        '</div>';
    }

    /* ---- Panel: CRM (generic) ---- */

    function crmPanel() {
        return '<div class="crm-generic">' +
            '<article class="wn-header-card">' +
                '<span>OPTIONAL INTEGRATION</span>' +
                '<h2>Your CRM</h2>' +
                '<p>Connect your existing CRM database, or use JARVIS as your standalone pipeline.</p>' +
            '</article>' +
            '<article class="crm-connect-info">' +
                '<h3>Supported Integrations</h3>' +
                '<ul>' +
                    '<li>Google Sheets</li>' +
                    '<li>Airtable (via API)</li>' +
                    '<li>Any SQL database</li>' +
                    '<li>CSV import</li>' +
                '</ul>' +
                '<p class="crm-note">Connection is optional. JARVIS works standalone without a CRM.</p>' +
            '</article>' +
            '<article class="crm-headers-preview">' +
                '<h3>Example Pipeline Columns</h3>' +
                '<table style="width:100%;border-collapse:collapse;margin-top:8px;">' +
                    '<tr style="background:#1a1f2e;">' +
                        '<th style="padding:8px;text-align:left;border-bottom:1px solid #333;">Name</th>' +
                        '<th style="padding:8px;text-align:left;border-bottom:1px solid #333;">Email</th>' +
                        '<th style="padding:8px;text-align:left;border-bottom:1px solid #333;">Phone</th>' +
                        '<th style="padding:8px;text-align:left;border-bottom:1px solid #333;">Website</th>' +
                        '<th style="padding:8px;text-align:left;border-bottom:1px solid #333;">City</th>' +
                        '<th style="padding:8px;text-align:left;border-bottom:1px solid #333;">Status</th>' +
                        '<th style="padding:8px;text-align:left;border-bottom:1px solid #333;">Last Contact</th>' +
                        '<th style="padding:8px;text-align:left;border-bottom:1px solid #333;">Notes</th>' +
                    '</tr>' +
                    '<tr>' +
                        '<td style="padding:8px;border-bottom:1px solid #222;">Acme Corp</td>' +
                        '<td style="padding:8px;border-bottom:1px solid #222;">info@acme.com</td>' +
                        '<td style="padding:8px;border-bottom:1px solid #222;">(614) 555-0123</td>' +
                        '<td style="padding:8px;border-bottom:1px solid #222;">acme.com</td>' +
                        '<td style="padding:8px;border-bottom:1px solid #222;">Columbus</td>' +
                        '<td style="padding:8px;border-bottom:1px solid #222;">Not Touched</td>' +
                        '<td style="padding:8px;border-bottom:1px solid #222;">\u2014</td>' +
                        '<td style="padding:8px;border-bottom:1px solid #222;">High fit score</td>' +
                    '</tr>' +
                '</table>' +
            '</article>' +
        '</div>';
    }

    /* ---- Panel: Approvals ---- */

    function approvalsPanel(items) {
        var pendingItems = items.filter(function (i) { return i.status === "pending"; });
        var reviewItems = items.filter(function (i) { return i.type === "governance-approval" && i.status === "pending"; });

        if (pendingItems.length === 0 && reviewItems.length === 0) {
            return '<article class="hub-row">No items require review. All clear!</article>';
        }

        var html = '';

        if (reviewItems.length > 0) {
            html += '<div class="batch-approvals"><h3>Batch Approvals</h3>';
            var groups = {};
            reviewItems.forEach(function (item) {
                var action = item.action || "other";
                if (!groups[action]) groups[action] = [];
                groups[action].push(item);
            });
            for (var action in groups) {
                var group = groups[action];
                var actionLabel = action.replace(/_/g, " ").replace(/\b\w/g, function (l) { return l.toUpperCase(); });
                html += '<div class="batch-group"><div class="batch-header"><strong>' + esc(actionLabel) + ' (' + group.length + ')</strong><div class="batch-actions"><button class="btn-batch-approve" data-ids="' + group.map(function (i) { return i.approvalId; }).join(",") + '">APPROVE ALL</button><button class="btn-batch-deny" data-ids="' + group.map(function (i) { return i.approvalId; }).join(",") + '">DENY ALL</button></div></div><div class="batch-items">' + group.map(function (item) {
                    return '<div class="batch-item"><span class="batch-item-title">' + esc(item.title) + '</span><span class="batch-item-status">' + esc(item.status) + '</span></div>';
                }).join("") + '</div></div>';
            }
            html += '</div>';
        }

        pendingItems.forEach(function (item) {
            var approvalButtons = item.approvalId ?
                '<div class="hub-approval-actions"><button data-approval="' + esc(item.approvalId) + '" class="btn-approve">APPROVE</button><button data-deny="' + esc(item.approvalId) + '" class="btn-deny">DENY</button></div>' : "";
            html += '<article class="hub-row"><div><span>' + esc(item.type) + ' \u00b7 ' + esc(item.status) + '</span><strong>' + esc(item.title) + '</strong><small>' + (item.confidence ? esc(item.confidence) + '% confidence \u00b7 ' : "") + esc(item.ventureId || "internal") + '</small></div>' + approvalButtons + '</article>';
        });

        return html;
    }

    /* ---- Render ---- */

    function render(workspace, data) {
        var allItems = data.items || [];
        var pendingCount = data.summary?.approvalsPending || 0;

        workspace.innerHTML = '<section class="agent-hub">' +
            '<header>' +
                '<div>' +
                    '<div class="eyebrow">JARVIS OS / AGENT HUB</div>' +
                    '<h1>Agent Hub</h1>' +
                    '<p>' + (data.registry?.length || 0) + ' agents registered \u00b7 ' + pendingCount + ' pending approvals</p>' +
                '</div>' +
                '<span>' + (data.summary?.total || 0) + ' ITEMS</span>' +
            '</header>' +
            '<nav class="hub-tabs">' +
                '<button data-section="pulse" class="tab-active">Market Pulse</button>' +
                '<button data-section="crm">CRM</button>' +
                '<button data-section="approvals">Approvals</button>' +
            '</nav>' +
            '<div id="hubSections">' +
                '<section data-panel="pulse">' + marketPulsePanel(data) + '</section>' +
                '<section data-panel="crm" hidden>' + crmPanel() + '</section>' +
                '<section data-panel="approvals" hidden>' + approvalsPanel(allItems) + '</section>' +
            '</div>' +
            '<p class="hub-boundary">Review and preparation only. No approval automatically executes outreach, spending, publishing, contracts, or transactions.</p>' +
        '</section>';

        /* Tab switching */
        workspace.querySelectorAll("[data-section]").forEach(function (button) {
            button.onclick = function () {
                workspace.querySelectorAll("[data-section]").forEach(function (b) { b.classList.remove("tab-active"); });
                button.classList.add("tab-active");
                workspace.querySelectorAll("[data-panel]").forEach(function (panel) {
                    panel.hidden = panel.dataset.panel !== button.dataset.section;
                });
            };
        });

        /* Approve / Deny buttons */
        workspace.querySelectorAll("[data-approval]").forEach(function (button) {
            button.onclick = async function () {
                if (!(await ensureAuth())) { alert("Session expired."); return loadAgentHub(); }
                button.disabled = true;
                button.textContent = "APPROVING...";
                try {
                    var response = await authFetch("/api/agent-hub/approvals/" + button.dataset.approval + "/approve", {
                        method: "POST",
                        body: JSON.stringify({ confirmation: "APPROVE" })
                    });
                    var payload = await response.json();
                    if (!response.ok) return alert("Error: " + (payload.error?.message || payload.error));
                    loadAgentHub();
                } catch (err) { alert("Error: " + err.message); button.disabled = false; button.textContent = "APPROVE"; }
            };
        });

        workspace.querySelectorAll("[data-deny]").forEach(function (button) {
            button.onclick = async function () {
                if (!(await ensureAuth())) { alert("Session expired."); return loadAgentHub(); }
                var reason = prompt("Reason for denying (optional):");
                if (reason === null) return;
                button.disabled = true;
                button.textContent = "DENYING...";
                try {
                    var response = await authFetch("/api/agent-hub/approvals/" + button.dataset.deny + "/deny", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ confirmation: "DENY", reason: reason })
                    });
                    var payload = await response.json();
                    if (!response.ok) return alert("Error: " + (payload.error?.message || payload.error));
                    loadAgentHub();
                } catch (err) { alert("Error: " + err.message); button.disabled = false; button.textContent = "DENY"; }
            };
        });

        /* Batch approve / deny */
        workspace.querySelectorAll(".btn-batch-approve").forEach(function (button) {
            button.onclick = async function () {
                if (!(await ensureAuth())) { alert("Session expired."); return loadAgentHub(); }
                var ids = button.dataset.ids.split(",").filter(Boolean);
                if (ids.length === 0) return;
                if (!confirm("Approve all " + ids.length + " items?")) return;
                button.disabled = true; button.textContent = "APPROVING...";
                var approved = 0;
                for (var i = 0; i < ids.length; i++) {
                    try {
                        var r = await authFetch("/api/agent-hub/approvals/" + ids[i] + "/approve", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ confirmation: "APPROVE" })
                        });
                        if (r.ok) approved++;
                    } catch (e) {}
                }
                alert("Approved " + approved + " of " + ids.length + "."); loadAgentHub();
            };
        });

        workspace.querySelectorAll(".btn-batch-deny").forEach(function (button) {
            button.onclick = async function () {
                if (!(await ensureAuth())) { alert("Session expired."); return loadAgentHub(); }
                var ids = button.dataset.ids.split(",").filter(Boolean);
                if (ids.length === 0) return;
                var reason = prompt("Reason for denying (optional):");
                if (reason === null) return;
                if (!confirm("Deny all " + ids.length + "?")) return;
                button.disabled = true; button.textContent = "DENYING...";
                var denied = 0;
                for (var i = 0; i < ids.length; i++) {
                    try {
                        var r = await authFetch("/api/agent-hub/approvals/" + ids[i] + "/deny", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ confirmation: "DENY", reason: reason })
                        });
                        if (r.ok) denied++;
                    } catch (e) {}
                }
                alert("Denied " + denied + " of " + ids.length + "."); loadAgentHub();
            };
        });

        /* Market Pulse Scan button */
        var scanBtn = workspace.querySelector("#runMarketPulseScan");
        if (scanBtn) {
            scanBtn.onclick = async function () {
                if (!(await ensureAuth())) { alert("Session expired."); return loadAgentHub(); }
                scanBtn.disabled = true;
                scanBtn.textContent = "SCANNING...";
                try {
                    var r = await authFetch("/api/market-pulse/run", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ confirmation: "RUN MARKET PULSE" })
                    });
                    var p = await r.json();
                    if (!r.ok) throw new Error(p.error?.message || "Scan failed");
                    alert("Market pulse scan complete. " + (p.data?.findingsCount || 0) + " findings discovered.");
                    loadAgentHub();
                } catch (e) {
                    alert("Scan failed: " + e.message);
                    scanBtn.disabled = false;
                    scanBtn.textContent = "Scan Market Now";
                }
            };
        }
    }

    /* ---- Load Agent Hub ---- */

    var pendingInitialTab = null;

    async function loadAgentHub(initialTab) {
        if (initialTab) pendingInitialTab = initialTab;
        var workspace = document.getElementById("conversation");
        workspace.innerHTML = '<section class="agent-hub"><article>Loading agent operations...</article></section>';

        var identity = null;
        if (window.JarvisAuth) {
            identity = await window.JarvisAuth.checkSession();
            if (!identity) identity = await window.JarvisAuth.autoLogin();
        }

        if (!identity) {
            workspace.innerHTML = '<section class="agent-hub">' +
                '<header><div><div class="eyebrow">JARVIS OS / AGENT HUB</div><h1>Agent Hub</h1></div></header>' +
                '<section class="hub-connect-section">' +
                    '<p>Connect with an owner or operator token to manage agents.</p>' +
                    '<div class="hub-connect-form">' +
                        '<input type="password" id="hubTokenInput" placeholder="Paste owner or operator token" />' +
                        '<button id="hubConnectBtn">CONNECT</button>' +
                    '</div>' +
                '</section>' +
            '</section>';
            workspace.querySelector("#hubConnectBtn").onclick = async function () {
                var input = workspace.querySelector("#hubTokenInput");
                var btn = workspace.querySelector("#hubConnectBtn");
                var token = input.value.trim();
                if (!token) return;
                btn.disabled = true;
                btn.textContent = "CONNECTING...";
                try {
                    await createSession(token);
                    loadAgentHub();
                } catch (err) {
                    alert("Connection failed: " + err.message);
                    btn.disabled = false;
                    btn.textContent = "CONNECT";
                }
            };
            return;
        }

        try {
            var response = await authFetch("/api/agent-hub");
            var type = response.headers.get("content-type") || "";
            if (!response.ok || !type.includes("application/json")) throw new Error("Agent Hub backend unavailable (HTTP " + response.status + ").");
            var payload = await response.json();
            render(workspace, payload.data);
        } catch (error) {
            workspace.innerHTML = '<section class="agent-hub"><article class="hub-error">' + esc(error.message) + '</article></section>';
        }

        if (pendingInitialTab) {
            var tabToSelect = pendingInitialTab;
            pendingInitialTab = null;
            var targetBtn = workspace.querySelector('[data-section="' + tabToSelect + '"]');
            if (targetBtn) targetBtn.click();
        }
    }

    window.loadAgentHub = loadAgentHub;
}());
