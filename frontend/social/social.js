(function () {
    "use strict";

    let storedToken = sessionStorage.getItem("jarvis.authToken") || null;

    function authHeaders() {
        const h = { "Content-Type": "application/json" };
        if (storedToken) h["Authorization"] = `Bearer ${storedToken}`;
        return h;
    }

    function authFetch(url, opts) {
        return fetch(url, { ...opts, credentials: "include", headers: { ...authHeaders(), ...(opts && opts.headers) } });
    }

    function esc(s) {
        const d = document.createElement("div");
        d.textContent = String(s || "");
        return d.innerHTML;
    }

    function formatDate(dateStr) {
        if (!dateStr) return "";
        try {
            const d = new Date(dateStr);
            const now = new Date();
            const diffH = Math.floor((now - d) / 3600000);
            if (diffH < 1) return "just now";
            if (diffH < 24) return `${diffH}h ago`;
            const diffD = Math.floor(diffH / 24);
            if (diffD < 7) return `${diffD}d ago`;
            return d.toLocaleDateString();
        } catch {
            return dateStr;
        }
    }

    let currentFilter = null;

    async function loadSocialFeed() {
        const workspace = document.getElementById("conversation");
        workspace.innerHTML = '<div class="social-feed"><div class="social-header"><h2>Loading social feeds...</h2></div></div>';

        try {
            const accountsRes = await authFetch("/api/social/accounts");
            const accountsData = await accountsRes.json();
            const accounts = accountsData.ok ? accountsData.data : [];

            const feedRes = await authFetch("/api/social/" + (currentFilter ? "?platform=" + currentFilter : ""));
            const feedData = await feedRes.json();
            const items = feedData.ok ? feedData.data.feeds : [];

            renderSocialPage(workspace, accounts, items);
        } catch (err) {
            workspace.innerHTML = `<div class="social-feed"><div class="social-empty"><h3>Connection Error</h3><p>${esc(err.message)}</p></div></div>`;
        }
    }

    function renderSocialPage(workspace, accounts, items) {
        const platforms = ["twitter", "instagram", "facebook", "linkedin", "rss"];
        const platformLabels = { twitter: "X / Twitter", instagram: "Instagram", facebook: "Facebook", linkedin: "LinkedIn", rss: "RSS" };

        workspace.innerHTML = `
            <div class="social-feed">
                <div class="social-header">
                    <h2>Social Media Feed</h2>
                    <p>Aggregated posts from your connected accounts. Click refresh to fetch latest.</p>
                </div>

                <div class="social-controls">
                    <button class="social-filter-btn ${!currentFilter ? "active" : ""}" data-filter="">All</button>
                    ${platforms.map(p => `<button class="social-filter-btn ${currentFilter === p ? "active" : ""}" data-filter="${p}">${platformLabels[p]}</button>`).join("")}
                    <button class="social-add-toggle" id="socialAddToggle">+ Add Account</button>
                    <button class="social-refresh-btn" id="socialRefreshBtn">⟳ Refresh</button>
                </div>

                <div class="social-add-form" id="socialAddForm">
                    <h3>Add Social Account</h3>
                    <div class="social-form-row">
                        <select class="social-form-select" id="socialPlatform">
                            ${platforms.map(p => `<option value="${p}">${platformLabels[p]}</option>`).join("")}
                            <option value="custom">Custom RSS</option>
                        </select>
                        <input class="social-form-input" id="socialName" placeholder="Account name" />
                        <input class="social-form-input" id="socialHandle" placeholder="Handle, URL, or slug" />
                        <button class="social-form-btn" id="socialAddBtn">Add</button>
                    </div>
                </div>

                ${accounts.length > 0 ? `<div class="social-accounts-list">${accounts.map(a => `
                    <span class="social-account-tag">
                        <span class="social-platform-badge ${esc(a.platform)}" style="width:16px;height:16px;font-size:8px;border-radius:4px">${esc(a.platform[0].toUpperCase())}</span>
                        ${esc(a.name || a.handle)}
                        <span class="remove-btn" data-id="${esc(a.id)}">&times;</span>
                    </span>
                `).join("")}</div>` : ""}

                <div class="social-feed-list" id="socialFeedList">
                    ${items.length === 0 ? `
                        <div class="social-empty">
                            <h3>No posts yet</h3>
                            <p>Add social accounts above or click Refresh to fetch feeds from configured accounts.</p>
                        </div>
                    ` : items.map(item => `
                        <div class="social-feed-item">
                            <div class="social-item-header">
                                <span class="social-platform-badge ${esc(item.platform)}">${esc((item.platform || "?")[0].toUpperCase())}</span>
                                <div class="social-item-meta">
                                    <span class="social-item-author">${esc(item.author || item.accountName || "Unknown")}</span>
                                    <span class="social-item-date">${formatDate(item.pubDate)}</span>
                                </div>
                            </div>
                            <div class="social-item-title">
                                ${item.link ? `<a href="${esc(item.link)}" target="_blank" rel="noopener">${esc(item.title)}</a>` : esc(item.title)}
                            </div>
                            ${item.content ? `<div class="social-item-content">${esc(item.content)}</div>` : ""}
                        </div>
                    `).join("")}
                </div>
            </div>
        `;

        workspace.querySelectorAll(".social-filter-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                currentFilter = btn.dataset.filter || null;
                loadSocialFeed();
            });
        });

        const refreshBtn = workspace.querySelector("#socialRefreshBtn");
        if (refreshBtn) {
            refreshBtn.addEventListener("click", async () => {
                refreshBtn.textContent = "⟳ Loading...";
                refreshBtn.disabled = true;
                try {
                    await authFetch("/api/social/refresh", { method: "POST" });
                    currentFilter = currentFilter;
                    await loadSocialFeed();
                } catch (e) {
                    refreshBtn.textContent = "⟳ Refresh";
                    refreshBtn.disabled = false;
                }
            });
        }

        const addToggle = workspace.querySelector("#socialAddToggle");
        const addForm = workspace.querySelector("#socialAddForm");
        if (addToggle && addForm) {
            addToggle.addEventListener("click", () => addForm.classList.toggle("visible"));
        }

        const addBtn = workspace.querySelector("#socialAddBtn");
        if (addBtn) {
            addBtn.addEventListener("click", async () => {
                const platform = workspace.querySelector("#socialPlatform").value;
                const name = workspace.querySelector("#socialName").value.trim();
                const handle = workspace.querySelector("#socialHandle").value.trim();
                if (!handle) return alert("Handle or URL is required");
                try {
                    await authFetch("/api/social/accounts", {
                        method: "POST",
                        body: JSON.stringify({ platform, name: name || handle, handle })
                    });
                    loadSocialFeed();
                } catch (e) {
                    alert("Failed to add account: " + e.message);
                }
            });
        }

        workspace.querySelectorAll(".remove-btn").forEach(btn => {
            btn.addEventListener("click", async () => {
                try {
                    await authFetch(`/api/social/accounts/${btn.dataset.id}`, { method: "DELETE" });
                    loadSocialFeed();
                } catch (e) {
                    alert("Failed to remove: " + e.message);
                }
            });
        });
    }

    window.loadSocialFeed = loadSocialFeed;
})();
