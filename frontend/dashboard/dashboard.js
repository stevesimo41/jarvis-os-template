console.log("Command Center module loaded");

function getDailyFaithVerse(date = new Date()) {
    const verses = [{ text: "This is the day which the Lord hath made; we will rejoice and be glad in it.", reference: "Psalm 118:24 (KJV)" }, { text: "As for me and my house, we will serve the Lord.", reference: "Joshua 24:15 (KJV)" }, { text: "Be strong and of a good courage; fear not, nor be afraid.", reference: "Deuteronomy 31:6 (KJV)" }, { text: "And now abideth faith, hope, charity, these three; but the greatest of these is charity.", reference: "1 Corinthians 13:13 (KJV)" }, { text: "Commit thy works unto the Lord, and thy thoughts shall be established.", reference: "Proverbs 16:3 (KJV)" }, { text: "We love him, because he first loved us.", reference: "1 John 4:19 (KJV)" }, { text: "The Lord is my shepherd; I shall not want.", reference: "Psalm 23:1 (KJV)" }];
    const start = new Date(date.getFullYear(), 0, 0);
    const day = Math.floor((date - start) / 86400000);
    return verses[day % verses.length];
}

function getDailyStoic(date = new Date()) {
    const stoicReadings = [{ author: "Marcus Aurelius", title: "On Control", text: "You have power over your mind — not outside events. Realize this, and you will find strength.", reflection: "Focus only on what is within your control: your thoughts, your actions, your character. Release the rest." }, { author: "Seneca", title: "On Time", text: "It is not that we have a short time to live, but that we waste a great deal of it.", reflection: "Time is your most precious resource. Spend it intentionally, not by default." }, { author: "Epictetus", title: "On Obstacles", text: "The impediment to action advances action. What stands in the way becomes the way.", reflection: "Every obstacle is an opportunity to practice virtue — patience, courage, creativity." }, { author: "Marcus Aurelius", title: "On Morning", text: "When you arise in the morning, think of what a privilege it is to be alive — to think, to enjoy, to love.", reflection: "Begin each day with gratitude. The mere fact of waking is a gift." }, { author: "Seneca", title: "On Adversity", text: "Difficulties strengthen the mind, as labor does the body.", reflection: "Hardship is not punishment — it is training. Embrace it as a sculptor embraces stone." }, { author: "Epictetus", title: "On Freedom", text: "No man is free who is not master of himself.", reflection: "True freedom is self-mastery — the ability to govern your desires and emotions." }, { author: "Marcus Aurelius", title: "On Kindness", text: "The best revenge is to be unlike him who performed the injury.", reflection: "Respond to cruelty with compassion. Rise above the behavior that provoked you." }, { author: "Seneca", title: "On Friendship", text: "Associate with people who are likely to improve you.", reflection: "Your companions shape your character. Choose those who elevate you." }, { author: "Epictetus", title: "On Peace", text: "Man is not worried by real problems so much as by his imagined anxieties about real problems.", reflection: "Most of your suffering comes from your interpretation, not the event itself." }, { author: "Marcus Aurelius", title: "On Death", text: "Think of yourself as dead. You have lived your life. Now, take what's left and live it properly.", reflection: "Memento mori — remembering death clarifies what truly matters." }, { author: "Seneca", title: "On Simplicity", text: "It is not the man who has too little, but the man who craves more, that is poor.", reflection: "Contentment is not about having less — it is about needing less." }, { author: "Epictetus", title: "On Anger", text: "Any person capable of angering you becomes your master.", reflection: "Anger is a surrender of your peace. Guard it fiercely." }];
    const start = new Date(date.getFullYear(), 0, 0);
    const dayOfYear = Math.floor((date - start) / 86400000);
    return stoicReadings[dayOfYear % stoicReadings.length];
}

async function loadCommandCenter() {
    if (!sessionStorage.getItem("jarvis.authToken")) {
        try {
            const r = await fetch("/api/auth/auto-login", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ deviceName: "JARVIS auto" }) });
            if (r.ok) { const d = await r.json(); if (d?.data?.token) sessionStorage.setItem("jarvis.authToken", d.data.token); }
        } catch (e) {}
    }

    const container = document.getElementById("dashboardRoot");
    if (!container) { console.error("Command Center container not found."); return; }

    container.innerHTML = `
        <div class="command-center-shell">
            <section class="command-hero">
                <div class="command-hero-main">
                    <div class="eyebrow">JARVIS OS</div>
                    <h1>Command Center</h1>
                    <p>System online. Projects, campaigns, and operations in one view.</p>
                </div>
                <div class="command-system-status">
                    <span class="status-dot"></span>
                    <div><strong>SYSTEM ONLINE</strong><span>Live intelligence connected</span></div>
                </div>
            </section>
            <div class="command-center-loading">
                <div class="loading-pulse"></div>
                <span>Loading...</span>
            </div>
        </div>
    `;

    try {
        const authToken = sessionStorage.getItem("jarvis.authToken") || "";
        const authHeaders = authToken ? { "Authorization": "Bearer " + authToken } : {};
        const [healthRes, campaignsRes] = await Promise.all([
            fetch("/api/command-center", { credentials: "include", headers: authHeaders }),
            fetch("/api/well-noticed-crm/campaigns", { credentials: "include", headers: authHeaders })
        ]);

        const healthData = healthRes.ok ? await healthRes.json() : { health: { checks: [] } };
        const healthChecks = healthData.health?.checks || [];

        let activeCampaigns = [];
        try { if (campaignsRes.ok) { const raw = await campaignsRes.json(); activeCampaigns = (raw.data || {}).active || []; } } catch (_e) {}

        const dailyVerse = getDailyFaithVerse();
        const dailyStoic = getDailyStoic();

        container.innerHTML = `
            <div class="command-center-shell">

                <section class="command-hero">
                    <div class="command-hero-main">
                        <div class="eyebrow">JARVIS OS</div>
                        <h1>Command Center</h1>
                        <p>System online. Projects, campaigns, and operations in one view.</p>
                    </div>
                    <div class="command-system-status">
                        <span class="status-dot"></span>
                        <div><strong>SYSTEM ONLINE</strong><span>Live intelligence connected</span></div>
                    </div>
                </section>

                <section class="faith-family-card" style="display:grid;grid-template-columns:1fr 1fr;gap:0;">
                    <div style="padding:20px 24px;border-right:1px solid rgba(255,255,255,0.06);">
                        <div class="eyebrow" style="color:#a78bfa;">DAILY FOUNDATION</div>
                        <blockquote style="font-style:italic;color:#e2e8f0;font-size:1rem;line-height:1.6;border-left:3px solid #a78bfa;padding-left:14px;margin:12px 0;">"${dailyVerse.text}"</blockquote>
                        <span style="color:#a78bfa;font-size:0.82rem;font-weight:600;">${dailyVerse.reference}</span>
                        <div style="margin-top:12px;"><strong>Lead with faith. Be present with family.</strong><span style="display:block;font-size:0.85em;color:#8899aa;">Carry purpose into today's priorities.</span></div>
                    </div>
                    <div style="padding:20px 24px;">
                        <div class="eyebrow" style="color:#f59e0b;">DAILY STOIC</div>
                        <div style="margin-top:8px;"><span style="color:#f59e0b;font-weight:600;font-size:0.85rem;">${dailyStoic.title}</span><span style="color:#64748b;font-size:0.8rem;margin-left:6px;">— ${dailyStoic.author}</span></div>
                        <blockquote style="font-style:italic;color:#e2e8f0;font-size:1rem;line-height:1.6;border-left:3px solid #f59e0b;padding-left:14px;margin:10px 0;">"${dailyStoic.text}"</blockquote>
                        <p style="color:#cbd5e1;font-size:0.88rem;line-height:1.5;margin-top:8px;">${dailyStoic.reflection}</p>
                    </div>
                </section>

                <div class="command-main-grid">

                    <section class="command-section">
                        <div class="command-section-header">
                            <div><div class="eyebrow">AVO PROJECTS</div><h2>Active Projects</h2></div>
                            <div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap">
                                <span style="font-size:0.8rem;color:#94a3b8">${healthData.projects?.activeProjects || 0} active</span>
                                <a href="#ventures" style="padding:7px 14px;background:#22c55e;color:#fff;border:none;border-radius:6px;cursor:pointer;font-weight:600;font-size:0.82em;text-decoration:none">VIEW ALL AVOs</a>
                            </div>
                        </div>
                        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;padding:0 4px">
                            <div style="padding:14px 16px;background:var(--surface,#1e293b);border-radius:10px;border:1px solid rgba(255,255,255,0.06);text-align:center">
                                <div style="font-size:1.8rem;font-weight:700;color:#22c55e">${healthData.projects?.byStatus?.inProgress || 0}</div>
                                <div style="font-size:0.8rem;color:#94a3b8;margin-top:4px">In Progress</div>
                            </div>
                            <div style="padding:14px 16px;background:var(--surface,#1e293b);border-radius:10px;border:1px solid rgba(255,255,255,0.06);text-align:center">
                                <div style="font-size:1.8rem;font-weight:700;color:#f59e0b">${healthData.projects?.byStatus?.scoping || 0}</div>
                                <div style="font-size:0.8rem;color:#94a3b8;margin-top:4px">Scoping</div>
                            </div>
                            <div style="padding:14px 16px;background:var(--surface,#1e293b);border-radius:10px;border:1px solid rgba(255,255,255,0.06);text-align:center">
                                <div style="font-size:1.8rem;font-weight:700;color:#ef4444">${healthData.projects?.byStatus?.blocked || 0}</div>
                                <div style="font-size:0.8rem;color:#94a3b8;margin-top:4px">Blocked</div>
                            </div>
                            <div style="padding:14px 16px;background:var(--surface,#1e293b);border-radius:10px;border:1px solid rgba(255,255,255,0.06);text-align:center">
                                <div style="font-size:1.8rem;font-weight:700;color:#64748b">${healthData.projects?.byStatus?.completed || 0}</div>
                                <div style="font-size:0.8rem;color:#94a3b8;margin-top:4px">Completed</div>
                            </div>
                        </div>
                        ${healthData.projects?.totalBlockers > 0 ? `
                        <div style="margin-top:12px;padding:10px 14px;background:rgba(239,68,68,0.08);border-radius:8px;border:1px solid rgba(239,68,68,0.2);font-size:0.85rem;color:#ef4444">
                            ⚠ ${healthData.projects.totalBlockers} active blocker${healthData.projects.totalBlockers !== 1 ? 's' : ''} requiring attention
                        </div>` : ''}
                    </section>

                    <section class="command-section">
                        <div class="command-section-header">
                            <div><div class="eyebrow">EMAIL PERFORMANCE</div><h2>Campaign Analytics</h2></div>
                            <span class="live-indicator"><span class="status-dot" style="background:#a78bfa"></span>TRACKING</span>
                        </div>
                        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;padding:0 4px">
                            <div style="padding:14px 16px;background:var(--surface,#1e293b);border-radius:10px;border:1px solid rgba(255,255,255,0.06);text-align:center">
                                <div style="font-size:1.8rem;font-weight:700;color:#4da3ff">${healthData.emailTracking?.totalSent || 0}</div>
                                <div style="font-size:0.8rem;color:#94a3b8;margin-top:4px">Sent</div>
                            </div>
                            <div style="padding:14px 16px;background:var(--surface,#1e293b);border-radius:10px;border:1px solid rgba(255,255,255,0.06);text-align:center">
                                <div style="font-size:1.8rem;font-weight:700;color:#22c55e">${healthData.emailTracking?.totalOpened || 0}</div>
                                <div style="font-size:0.8rem;color:#94a3b8;margin-top:4px">Opened</div>
                            </div>
                            <div style="padding:14px 16px;background:var(--surface,#1e293b);border-radius:10px;border:1px solid rgba(255,255,255,0.06);text-align:center">
                                <div style="font-size:1.8rem;font-weight:700;color:#f59e0b">${healthData.emailTracking?.totalClicked || 0}</div>
                                <div style="font-size:0.8rem;color:#94a3b8;margin-top:4px">Clicked</div>
                            </div>
                            <div style="padding:14px 16px;background:var(--surface,#1e293b);border-radius:10px;border:1px solid rgba(255,255,255,0.06);text-align:center">
                                <div style="font-size:1.8rem;font-weight:700;color:#a78bfa">${healthData.emailTracking?.openRate || 0}%</div>
                                <div style="font-size:0.8rem;color:#94a3b8;margin-top:4px">Open Rate</div>
                            </div>
                        </div>
                    </section>

                </div>

                <section class="command-section" style="margin-bottom:22px;border-left:3px solid #4da3ff;background:rgba(77,163,255,0.04)">
                    <div class="command-section-header">
                        <div><div class="eyebrow" style="color:#4da3ff">OPERATIONS OVERVIEW</div><h2>Active Systems</h2></div>
                        <span class="live-indicator"><span class="status-dot" style="background:#4da3ff"></span>ONLINE</span>
                    </div>
                    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px;padding:0 4px">
                        <div style="padding:14px 16px;background:var(--surface,#1e293b);border-radius:10px;border:1px solid rgba(255,255,255,0.06)">
                            <div style="font-size:0.65rem;color:#4da3ff;text-transform:uppercase;letter-spacing:0.05em;font-weight:600;margin-bottom:4px;">Venture Projects</div>
                            <div style="font-size:0.9rem;font-weight:600;color:#e2e8f0">${healthData.projects?.activeProjects || 0} active · ${healthData.projects?.totalBlockers || 0} blocker${healthData.projects?.totalBlockers !== 1 ? 's' : ''}</div>
                            <div style="font-size:0.75rem;color:#94a3b8;margin-top:2px">${healthData.projects?.byStatus?.inProgress || 0} in-progress · ${healthData.projects?.byStatus?.scoping || 0} scoping · ${healthData.projects?.byStatus?.completed || 0} completed</div>
                        </div>
                        <div style="padding:14px 16px;background:var(--surface,#1e293b);border-radius:10px;border:1px solid rgba(255,255,255,0.06)">
                            <div style="font-size:0.65rem;color:#22c55e;text-transform:uppercase;letter-spacing:0.05em;font-weight:600;margin-bottom:4px;">Email Outreach</div>
                            <div style="font-size:0.9rem;font-weight:600;color:#e2e8f0">${healthData.emailTracking?.totalSent || 0} sent · ${healthData.emailTracking?.totalOpened || 0} opened</div>
                            <div style="font-size:0.75rem;color:#94a3b8;margin-top:2px">${activeCampaigns.length} active cadences · ${healthData.emailTracking?.openRate || 0}% open rate</div>
                        </div>
                        <div style="padding:14px 16px;background:var(--surface,#1e293b);border-radius:10px;border:1px solid rgba(255,255,255,0.06)">
                            <div style="font-size:0.65rem;color:#f59e0b;text-transform:uppercase;letter-spacing:0.05em;font-weight:600;margin-bottom:4px;">Pipeline</div>
                            <div style="font-size:0.9rem;font-weight:600;color:#e2e8f0">${activeCampaigns.length} campaign${activeCampaigns.length !== 1 ? 's' : ''} running</div>
                            <div style="font-size:0.75rem;color:#94a3b8;margin-top:2px">${healthData.emailTracking?.totalClicked || 0} click${healthData.emailTracking?.totalClicked !== 1 ? 's' : ''} tracked</div>
                        </div>
                    </div>
                </section>

                ${activeCampaigns.length > 0 ? `
                <section class="command-section" style="margin-bottom:22px;border-left:3px solid #4da3ff;background:rgba(77,163,255,0.04)">
                    <div class="command-section-header">
                        <div><div class="eyebrow" style="color:#4da3ff">PROSPECTING CADENCE</div><h2>Active Campaigns</h2></div>
                        <span class="live-indicator"><span class="status-dot" style="background:#4da3ff"></span>${activeCampaigns.length} ACTIVE</span>
                    </div>
                    <div style="display:grid;gap:12px;padding:0 4px">
                        ${activeCampaigns.slice(0, 10).map(c => {
                            const email = c.executiveEmail || "";
                            const currentStep = c.currentStep || 0;
                            const totalSteps = c.steps ? c.steps.length : 5;
                            const nextStep = c.steps && c.steps[currentStep] ? c.steps[currentStep] : null;
                            const nextStepName = nextStep ? (nextStep.type === "email" ? "Email" : nextStep.type === "text" ? "Text" : nextStep.type === "linkedin" ? "LinkedIn" : nextStep.type === "contact_form" ? "Contact Form" : nextStep.type || "Step") : "Complete";
                            const nextTouchDate = nextStep && nextStep.scheduledFor ? new Date(nextStep.scheduledFor).toLocaleDateString() : "";
                            return `<div style="padding:14px 16px;background:var(--surface,#1e293b);border-radius:10px;border:1px solid rgba(255,255,255,0.06)">
                                <div style="display:flex;justify-content:space-between;align-items:center">
                                    <div style="flex:1;min-width:0">
                                        <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
                                            <span style="background:#4da3ff22;color:#4da3ff;font-size:0.65rem;padding:2px 8px;border-radius:4px;font-weight:600;letter-spacing:0.05em;">CADENCE</span>
                                            <span style="font-weight:600;font-size:0.95em;color:#e2e8f0">${escapeHtml(c.prospectName || "Unknown")}</span>
                                        </div>
                                        <div style="font-size:0.85em;color:#94a3b8">
                                            Step ${currentStep + 1} of ${totalSteps} · Next: <span style="color:#4da3ff">${escapeHtml(nextStepName)}</span>${nextTouchDate ? " · Scheduled: " + nextTouchDate : ""}${email ? " · " + escapeHtml(email) : ""}
                                        </div>
                                        ${c.category ? `<div style="font-size:0.8em;color:#64748b;margin-top:2px">${escapeHtml(c.category)}</div>` : ''}
                                    </div>
                                    <div style="display:flex;gap:8px;margin-left:16px;flex-shrink:0">
                                        <button onclick="window.location.hash='agent-hub'" style="padding:7px 14px;background:#4da3ff;color:#fff;border:none;border-radius:6px;cursor:pointer;font-weight:600;font-size:0.82em">VIEW</button>
                                    </div>
                                </div>
                            </div>`;
                        }).join("")}
                    </div>
                </section>` : ''}

                <section class="command-section">
                    <div class="command-section-header">
                        <div><div class="eyebrow">SYSTEM HEALTH</div><h2>JARVIS Infrastructure</h2></div>
                        <span class="live-indicator"><span class="status-dot"></span>LIVE</span>
                    </div>
                    <div class="health-grid">
                        ${healthChecks.length ? healthChecks.map(check => `
                            <div class="health-card">
                                <div class="health-card-main">
                                    <span class="status-dot ${check.status === "healthy" ? "healthy" : "warning"}"></span>
                                    <div><strong>${check.system}</strong><span>Infrastructure service</span></div>
                                </div>
                                <span class="health-status ${check.status === "healthy" ? "healthy" : "warning"}">${check.status}</span>
                            </div>`).join("") : `<div class="empty-state">No health checks available.</div>`}
                    </div>
                </section>

                <footer class="command-footer">
                    <div>LAST SYNCHRONIZED <strong>${new Date().toLocaleString()}</strong></div>
                    <button class="refresh-command-center" onclick="loadCommandCenter()">REFRESH</button>
                </footer>

            </div>`;
    } catch (error) {
        console.error("Unable to load Command Center:", error);
        container.innerHTML = `
            <div class="command-center-shell">
                <div class="command-error">
                    <div class="eyebrow">CONNECTION ERROR</div>
                    <h2>JARVIS intelligence unavailable</h2>
                    <p>${error.message}</p>
                    <button onclick="loadCommandCenter()">RETRY CONNECTION</button>
                </div>
            </div>`;
    }
}

window.loadCommandCenter = loadCommandCenter;
window.loadExecutiveBrief = loadCommandCenter;

function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = String(text ?? "");
    return div.innerHTML;
}
