console.log("Content Agent module loaded");

function escContent(text) {
    const node = document.createElement("div");
    node.textContent = String(text ?? "");
    return node.innerHTML;
}

let contentState = {
    activeTab: "website",
    results: null,
    loading: false
};

async function loadContentAgent() {
    const workspace = document.getElementById("conversation");
    if (!workspace) return;

    workspace.innerHTML = `
        <div class="module-shell">
            <div class="module-hero">
                <div>
                    <div class="eyebrow">CONTENT AGENT</div>
                    <h1>Content Studio</h1>
                    <p>Review websites, create social content, generate print ads.</p>
                </div>
                <div class="system-status">
                    <span class="status-dot"></span>
                    LOADING
                </div>
            </div>
        </div>
    `;

    try {
        const response = await fetch("/api/content-agent");
        const data = await response.json();

        renderContentStudio(workspace, data.data);
    } catch (error) {
        workspace.innerHTML = `
            <div class="module-shell">
                <div class="module-error">
                    <div class="eyebrow">CONTENT AGENT ERROR</div>
                    <h2>Unable to load Content Agent</h2>
                    <p>${escContent(error.message)}</p>
                    <button onclick="loadContentAgent()">Retry</button>
                </div>
            </div>
        `;
    }
}

function renderContentStudio(workspace, data) {
    const { status, recent } = data;

    workspace.innerHTML = `
        <div class="module-shell">
            <div class="module-header">
                <div class="eyebrow">CONTENT AGENT</div>
                <h1>Content Studio</h1>
                <p class="subtitle">Review, create, and enhance content across all ventures.</p>
            </div>

            <div class="module-grid">
                <div class="module-card">
                    <div class="card-label">CAPABILITIES</div>
                    <h2>${status.capabilities.length} Active</h2>
                    <p>${status.capabilities.join(" · ")}</p>
                </div>
                <div class="module-card">
                    <div class="card-label">AVOS</div>
                    <h2>${status.ventures.length} Brands</h2>
                    <p>${status.ventures.join(" · ")}</p>
                </div>
                <div class="module-card">
                    <div class="card-label">CONTENT GENERATED</div>
                    <h2>${status.metrics.runCount}</h2>
                    <p>Reviews: ${status.metrics.totalReviews} · Posts: ${status.metrics.totalSocialPosts} · Ads: ${status.metrics.totalPrintAds}</p>
                </div>
            </div>

            <div class="content-tabs">
                <button class="content-tab active" data-tab="website">Website Review</button>
                <button class="content-tab" data-tab="social">Social Media</button>
                <button class="content-tab" data-tab="print">Print Content</button>
                <button class="content-tab" data-tab="recent">Recent Work</button>
            </div>

            <div id="contentTabContent" class="content-tab-content">
                ${renderWebsiteTab()}
            </div>
        </div>
    `;

    workspace.querySelectorAll(".content-tab").forEach(tab => {
        tab.addEventListener("click", () => {
            workspace.querySelectorAll(".content-tab").forEach(t => t.classList.remove("active"));
            tab.classList.add("active");
            const tabContent = document.getElementById("contentTabContent");
            switch (tab.dataset.tab) {
                case "website": tabContent.innerHTML = renderWebsiteTab(); break;
                case "social": tabContent.innerHTML = renderSocialTab(); break;
                case "print": tabContent.innerHTML = renderPrintTab(); break;
                case "recent": tabContent.innerHTML = renderRecentTab(recent); break;
            }
            attachTabHandlers();
        });
    });

    attachTabHandlers();
}

function renderWebsiteTab() {
    return `
        <div class="content-section">
            <h3>Website Review</h3>
            <p style="color:#8899aa;font-size:0.85rem;margin-bottom:16px;">Analyze any website for content, SEO, brand consistency, and improvement opportunities.</p>
            <div class="content-input-group">
                <input type="url" id="websiteUrl" placeholder="https://xodusrp.org" class="content-input" />
                <button id="reviewWebsiteBtn" class="content-btn primary">REVIEW SITE</button>
            </div>
            <div id="websiteResults" style="margin-top:16px;"></div>
        </div>
    `;
}

function renderSocialTab() {
    return `
        <div class="content-section">
            <h3>Social Media Content</h3>
            <p style="color:#8899aa;font-size:0.85rem;margin-bottom:16px;">Create posts for LinkedIn, Facebook, Instagram, and X across all ventures.</p>
            <div class="content-input-group">
                <select id="socialVenture" class="content-select">
                    <option value="well-noticed">Well Noticed</option>
                    <option value="xodus">Xodus Recovery</option>
                    <option value="real-estate">Real Estate</option>
                    <option value="personal">Personal</option>
                </select>
                <input type="text" id="socialTopic" placeholder="Topic or theme for the post" class="content-input" style="flex:2;" />
            </div>
            <div class="content-input-group" style="margin-top:8px;">
                <label style="color:#8899aa;font-size:0.8rem;display:flex;align-items:center;gap:6px;">
                    <input type="checkbox" value="linkedin" checked /> LinkedIn
                </label>
                <label style="color:#8899aa;font-size:0.8rem;display:flex;align-items:center;gap:6px;">
                    <input type="checkbox" value="facebook" checked /> Facebook
                </label>
                <label style="color:#8899aa;font-size:0.8rem;display:flex;align-items:center;gap:6px;">
                    <input type="checkbox" value="instagram" checked /> Instagram
                </label>
                <label style="color:#8899aa;font-size:0.8rem;display:flex;align-items:center;gap:6px;">
                    <input type="checkbox" value="x" /> X (Twitter)
                </label>
                <button id="generateSocialBtn" class="content-btn primary" style="margin-left:auto;">GENERATE</button>
            </div>
            <div id="socialResults" style="margin-top:16px;"></div>
        </div>
    `;
}

function renderPrintTab() {
    return `
        <div class="content-section">
            <h3>Print Content</h3>
            <p style="color:#8899aa;font-size:0.85rem;margin-bottom:16px;">Generate print ad content for Well Noticed (9.25" x 4.125" with bleed, CMYK).</p>
            <div class="content-input-group">
                <select id="printVenture" class="content-select">
                    <option value="well-noticed">Well Noticed</option>
                </select>
                <input type="text" id="printCompany" placeholder="Company name for the ad" class="content-input" style="flex:2;" />
            </div>
            <div class="content-input-group" style="margin-top:8px;">
                <textarea id="printDetails" placeholder="Company details, services, key selling points..." class="content-textarea" rows="3"></textarea>
            </div>
            <div style="margin-top:8px;">
                <button id="generatePrintBtn" class="content-btn primary">GENERATE PRINT CONTENT</button>
            </div>
            <div id="printResults" style="margin-top:16px;"></div>
        </div>
    `;
}

function renderRecentTab(recent) {
    const items = [
        ...(recent.websiteReviews || []).map(r => ({ type: "review", title: r.url, date: r.analyzedAt })),
        ...(recent.socialPosts || []).map(p => ({ type: "social", title: `${p.brand} — ${p.platform}`, date: p.createdAt })),
        ...(recent.printAds || []).map(a => ({ type: "print", title: `${a.venture} print ad`, date: a.createdAt }))
    ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 20);

    if (items.length === 0) {
        return `<div class="content-section"><h3>Recent Work</h3><p style="color:#8899aa;">No content generated yet. Start with a website review or social post.</p></div>`;
    }

    return `
        <div class="content-section">
            <h3>Recent Work</h3>
            <div class="content-list">
                ${items.map(item => `
                    <div class="content-list-item">
                        <span class="content-badge ${item.type}">${item.type}</span>
                        <span>${escContent(item.title)}</span>
                        <span style="color:#667788;font-size:0.75rem;margin-left:auto;">${new Date(item.date).toLocaleDateString()}</span>
                    </div>
                `).join("")}
            </div>
        </div>
    `;
}

function attachTabHandlers() {
    document.getElementById("reviewWebsiteBtn")?.addEventListener("click", async () => {
        const url = document.getElementById("websiteUrl")?.value;
        if (!url) return alert("Enter a URL to review");
        const btn = document.getElementById("reviewWebsiteBtn");
        btn.disabled = true;
        btn.textContent = "REVIEWING...";
        try {
            const res = await fetch("/api/content-agent/website-review", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url })
            });
            const data = await res.json();
            const results = document.getElementById("websiteResults");
            if (data.data?.siteData) {
                const sd = data.data.siteData;
                results.innerHTML = `
                    <div class="content-result-card">
                        <h4>${escContent(sd.title || url)}</h4>
                        ${sd.metaDescription ? `<p style="color:#8899aa;font-size:0.85rem;"><strong>Meta:</strong> ${escContent(sd.metaDescription)}</p>` : ""}
                        ${sd.headings?.length ? `<div style="margin-top:8px;"><strong style="font-size:0.8rem;color:#8899aa;">HEADINGS:</strong>${sd.headings.map(h => `<div style="color:#cbd5e1;font-size:0.85rem;margin-left:${(h.level-1)*12}px;">H${h.level}: ${escContent(h.text)}</div>`).join("")}</div>` : ""}
                        ${sd.contactInfo?.phone ? `<p style="font-size:0.85rem;margin-top:8px;">📞 ${escContent(sd.contactInfo.phone)}</p>` : ""}
                        ${sd.contactInfo?.email ? `<p style="font-size:0.85rem;">✉️ ${escContent(sd.contactInfo.email)}</p>` : ""}
                        <div style="margin-top:12px;padding:12px;background:rgba(77,163,255,.08);border-radius:6px;">
                            <strong style="font-size:0.8rem;color:#4da3ff;">REVIEW PROMPT (send to JARVIS):</strong>
                            <pre style="color:#cbd5e1;font-size:0.8rem;white-space:pre-wrap;margin-top:8px;max-height:200px;overflow-y:auto;">${escContent(data.data.prompt)}</pre>
                        </div>
                    </div>
                `;
            } else {
                results.innerHTML = `<p style="color:#f87171;">Error: ${escContent(data.data?.error || "Unknown error")}</p>`;
            }
        } catch (e) {
            alert("Review failed: " + e.message);
        } finally {
            btn.disabled = false;
            btn.textContent = "REVIEW SITE";
        }
    });

    document.getElementById("generateSocialBtn")?.addEventListener("click", async () => {
        const venture = document.getElementById("socialVenture")?.value;
        const topic = document.getElementById("socialTopic")?.value;
        if (!topic) return alert("Enter a topic");
        const platforms = [...document.querySelectorAll('.content-tabs input[type="checkbox"]:checked')].map(c => c.value);
        if (platforms.length === 0) return alert("Select at least one platform");
        const btn = document.getElementById("generateSocialBtn");
        btn.disabled = true;
        btn.textContent = "GENERATING...";
        try {
            const res = await fetch("/api/content-agent/social-post", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ venture, topic, platforms })
            });
            const data = await res.json();
            const results = document.getElementById("socialResults");
            const prompts = data.data?.prompts || {};
            results.innerHTML = Object.entries(prompts).map(([platform, prompt]) => `
                <div class="content-result-card" style="margin-bottom:12px;">
                    <h4 style="text-transform:capitalize;">${escContent(platform)}</h4>
                    <pre style="color:#cbd5e1;font-size:0.8rem;white-space:pre-wrap;max-height:200px;overflow-y:auto;">${escContent(prompt)}</pre>
                </div>
            `).join("");
        } catch (e) {
            alert("Generation failed: " + e.message);
        } finally {
            btn.disabled = false;
            btn.textContent = "GENERATE";
        }
    });

    document.getElementById("generatePrintBtn")?.addEventListener("click", async () => {
        const venture = document.getElementById("printVenture")?.value;
        const company = document.getElementById("printCompany")?.value;
        const details = document.getElementById("printDetails")?.value;
        if (!company) return alert("Enter a company name");
        const btn = document.getElementById("generatePrintBtn");
        btn.disabled = true;
        btn.textContent = "GENERATING...";
        try {
            const res = await fetch("/api/content-agent/print-ad", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    venture,
                    companyData: {
                        companyName: company,
                        industry: "commercial services",
                        services: details ? details.split(",").map(d => d.trim()).filter(Boolean) : [],
                        phone: "(614) 555-0100",
                        website: "yoursite.com"
                    },
                    template: "well-noticed-ad"
                })
            });
            const data = await res.json();
            const results = document.getElementById("printResults");
            const ad = data.data?.ad;
            const content = ad?.content;
            if (content) {
                results.innerHTML = `
                    <div class="content-result-card">
                        <h4>Print Ad Content — Well Noticed</h4>
                        <div style="margin:8px 0;padding:8px;background:rgba(255,255,255,.03);border-radius:4px;font-size:0.8rem;color:#8899aa;">
                            Specs: ${content.totalSize} (with bleed) · ${content.liveArea} live area · CMYK
                        </div>
                        <div style="margin-top:12px;">
                            <div style="margin-bottom:12px;">
                                <div style="color:#f59e0b;font-size:0.75rem;text-transform:uppercase;letter-spacing:0.05em;">HEADLINE</div>
                                <div style="color:#e2e8f0;font-size:1.1rem;font-weight:700;margin-top:4px;">${escContent(content.headline)}</div>
                            </div>
                            <div style="margin-bottom:12px;">
                                <div style="color:#f59e0b;font-size:0.75rem;text-transform:uppercase;letter-spacing:0.05em;">SUBHEADLINE</div>
                                <div style="color:#cbd5e1;font-size:0.88rem;margin-top:4px;">${escContent(content.subheadline)}</div>
                            </div>
                            <div style="margin-bottom:12px;">
                                <div style="color:#f59e0b;font-size:0.75rem;text-transform:uppercase;letter-spacing:0.05em;">BODY COPY</div>
                                <div style="color:#cbd5e1;font-size:0.85rem;margin-top:4px;line-height:1.6;">${escContent(content.bodyCopy)}</div>
                            </div>
                            <div style="margin-bottom:12px;">
                                <div style="color:#f59e0b;font-size:0.75rem;text-transform:uppercase;letter-spacing:0.05em;">CALL TO ACTION</div>
                                <div style="color:#22c55e;font-size:0.88rem;font-weight:600;margin-top:4px;">${escContent(content.cta)}</div>
                            </div>
                            <div style="margin-bottom:12px;">
                                <div style="color:#f59e0b;font-size:0.75rem;text-transform:uppercase;letter-spacing:0.05em;">SERVICES LINE</div>
                                <div style="color:#cbd5e1;font-size:0.85rem;margin-top:4px;">${escContent(content.servicesLine)}</div>
                            </div>
                            <div style="display:flex;gap:16px;margin-bottom:12px;">
                                <div style="flex:1;">
                                    <div style="color:#f59e0b;font-size:0.75rem;text-transform:uppercase;letter-spacing:0.05em;">CONTACT</div>
                                    <div style="color:#cbd5e1;font-size:0.85rem;margin-top:4px;">${escContent(content.contactInfo.phone)}</div>
                                    <div style="color:#4da3ff;font-size:0.85rem;">${escContent(content.contactInfo.website)}</div>
                                </div>
                                <div style="flex:1;">
                                    <div style="color:#f59e0b;font-size:0.75rem;text-transform:uppercase;letter-spacing:0.05em;">QR CODE</div>
                                    <div style="color:#cbd5e1;font-size:0.85rem;margin-top:4px;">${escContent(content.contactInfo.qrPlacement)}</div>
                                </div>
                            </div>
                            <div style="margin-bottom:12px;">
                                <div style="color:#f59e0b;font-size:0.75rem;text-transform:uppercase;letter-spacing:0.05em;">VISUAL DIRECTION</div>
                                <div style="color:#cbd5e1;font-size:0.85rem;margin-top:4px;">${escContent(content.visualDirection)}</div>
                            </div>
                            <div style="display:flex;gap:16px;">
                                <div style="flex:1;">
                                    <div style="color:#f59e0b;font-size:0.75rem;text-transform:uppercase;letter-spacing:0.05em;">COLORS</div>
                                    <div style="color:#cbd5e1;font-size:0.82rem;margin-top:4px;">${Object.entries(content.colorPalette).map(([k,v]) => `${k}: ${v}`).join(" · ")}</div>
                                </div>
                                <div style="flex:1;">
                                    <div style="color:#f59e0b;font-size:0.75rem;text-transform:uppercase;letter-spacing:0.05em;">TYPOGRAPHY</div>
                                    <div style="color:#cbd5e1;font-size:0.82rem;margin-top:4px;">${Object.entries(content.typography).map(([k,v]) => `${k}: ${v}`).join(" · ")}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            } else {
                results.innerHTML = `
                    <div class="content-result-card">
                        <h4>Print Ad Content — Well Noticed</h4>
                        <pre style="color:#cbd5e1;font-size:0.8rem;white-space:pre-wrap;max-height:300px;overflow-y:auto;">${escContent(data.data?.prompt)}</pre>
                    </div>
                `;
            }
        } catch (e) {
            alert("Generation failed: " + e.message);
        } finally {
            btn.disabled = false;
            btn.textContent = "GENERATE PRINT CONTENT";
        }
    });
}

window.loadContentAgent = loadContentAgent;
