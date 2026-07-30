console.log("Daily Mission module loaded");

function escapeMission(text) {
    const node = document.createElement("div");
    node.textContent = String(text ?? "");
    return node.innerHTML;
}

let missionState = {
    priorities: null,
    originalOrder: [],
    userOrder: [],
    approved: false,
    todayActions: null,
    processingAction: null
};

let _lastEnrichData = null;

let storedToken = sessionStorage.getItem("jarvis.authToken") || null;

function missionHeaders() {
    const h = { "Content-Type": "application/json" };
    if (storedToken) h["Authorization"] = "Bearer " + storedToken;
    return h;
}

function missionFetch(url, opts) {
    return fetch(url, { ...opts, credentials: "include", headers: { ...missionHeaders(), ...(opts && opts.headers || {}) } });
}

async function loadMission() {
    if (!storedToken) {
        try { const r = await fetch("/api/auth/auto-login", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ deviceName: "JARVIS auto" }) }); if (r.ok) { const d = await r.json(); if (d?.data?.token) { storedToken = d.data.token; sessionStorage.setItem("jarvis.authToken", d.data.token); } } } catch (e) {}
    }
    const workspace = document.getElementById("conversation");
    if (!workspace) return;

    workspace.innerHTML = `
        <div class="module-shell mission-center">
            <div class="module-hero">
                <div>
                    <div class="eyebrow">DAILY MISSION</div>
                    <h1>Today's Execution</h1>
                    <p>Loading your morning briefing...</p>
                </div>
                <div class="system-status">
                    <span class="status-dot"></span>
                    LOADING
                </div>
            </div>
            <div class="module-loading">
                <div class="loading-pulse"></div>
                <span>Synchronizing live intelligence...</span>
            </div>
        </div>
    `;

    try {
        const [prioritiesResponse, hubResponse, actionsResponse] = await Promise.all([
            missionFetch("/api/daily-priorities").catch(() => null),
            missionFetch("/api/agent-hub").catch(() => null),
            missionFetch("/api/today-actions").catch(() => null)
        ]);

        const prioritiesData = prioritiesResponse?.ok ? await prioritiesResponse.json() : null;
        const hubData = hubResponse?.ok ? await hubResponse.json() : null;
        const actionsData = actionsResponse?.ok ? await actionsResponse.json() : null;

        const priorities = prioritiesData?.priorities || null;
        const hubItems = hubData?.data?.items || [];
        const pendingApprovals = hubItems.filter(i => i.status === "pending");
        const todayActions = actionsData?.data?.actions || [];

        if (priorities) {
            missionState.priorities = priorities;
            missionState.originalOrder = [...priorities.priorities];
            missionState.userOrder = [...priorities.priorities];
            missionState.approved = false;
        }
        missionState.todayActions = todayActions;

        renderMission(priorities, pendingApprovals, todayActions);

    } catch (error) {
        console.error("Daily Mission loading failed", error);
        workspace.innerHTML = `
            <div class="mission-center">
                <div class="module-error">
                    <div class="eyebrow">DAILY MISSION ERROR</div>
                    <h2>Unable to load Mission Intelligence</h2>
                    <p>${escapeMission(error.message)}</p>
                    <button onclick="loadMission()">Retry</button>
                </div>
            </div>
        `;
    }
}

function renderMission(priorities, pendingApprovals, todayActions) {
    const workspace = document.getElementById("conversation");
    if (!workspace) return;

    if (!priorities) {
        workspace.innerHTML = `
            <div class="mission-center">
                <div class="module-error">
                    <div class="eyebrow">DAILY MISSION</div>
                    <h2>No priorities available</h2>
                    <p>JARVIS is still gathering intelligence. Check back soon.</p>
                    <button onclick="loadMission()">Retry</button>
                </div>
            </div>
        `;
        return;
    }

    const { devotional, priorities: priorityList } = priorities;
    const displayOrder = missionState.userOrder || priorityList;

    function validItem(item) {
        const pd = item.prospectDetails || {};
        const name = (pd.name || item.title || "").trim();
        return name && name !== "Unknown" && name !== "N/A" && name !== "review_venture_candidate" && !name.startsWith("review_venture_candidate");
    }

    function sortByFit(items) {
        return [...items].sort((a, b) => {
            const fa = (a.prospectDetails?.fitScore || 0);
            const fb = (b.prospectDetails?.fitScore || 0);
            return fb - fa;
        });
    }

    const approvalItems = (todayActions || []).filter(validItem);
    const totalPending = approvalItems.length;
    const junkCount = (todayActions || []).length - totalPending;
    const wellNoticedItems = sortByFit(approvalItems.filter(i => i.source === "well-noticed" || (i.source === "avo" && i.actionType === "venture_outreach")));
    const avoItems = sortByFit(approvalItems.filter(i => i.source === "avo" && i.type !== "avo-candidate" && i.actionType !== "venture_outreach"));
    const mpoItems = sortByFit(approvalItems.filter(i => i.source === "market-pulse"));
    const campaignItems = sortByFit(approvalItems.filter(i => i.source === "campaign"));
    const systemItems = sortByFit(approvalItems.filter(i => i.source === "system"));
    const otherItems = sortByFit(approvalItems.filter(i => ["well-noticed","avo","market-pulse","campaign","system"].indexOf(i.source) === -1));

    workspace.innerHTML = `
        <div class="mission-center">

            <div class="module-header">
                <div class="eyebrow">DAILY MISSION</div>
                <h1>Today's Execution</h1>
                <p class="subtitle">${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>

            <div class="module-grid">

                <div class="module-card module-full faith-card" style="display:grid;grid-template-columns:1fr 1fr;gap:0;background:linear-gradient(135deg,rgba(77,163,255,.08),rgba(167,139,250,.08));border:1px solid rgba(77,163,255,.15);">
                    <div style="padding:20px 24px;border-right:1px solid rgba(255,255,255,0.06);">
                        <div class="card-label" style="color:#a78bfa;">DAILY FOUNDATION</div>
                        <blockquote style="font-style:italic;color:#e2e8f0;font-size:1.05rem;line-height:1.6;border-left:3px solid #a78bfa;padding-left:16px;margin:12px 0;">
                            "${escapeMission(devotional.verse)}"
                        </blockquote>
                        <div style="margin-top:8px;color:#a78bfa;font-size:0.85rem;font-weight:600;">— ${escapeMission(devotional.reference)}</div>
                        <p style="color:#cbd5e1;font-size:0.9rem;line-height:1.6;margin-top:12px;">${escapeMission(devotional.reflection)}</p>
                    </div>
                    <div style="padding:20px 24px;" id="stoicCard">
                        <div class="card-label" style="color:#f59e0b;">DAILY STOIC</div>
                        <div style="margin-top:8px;">
                            <span style="color:#f59e0b;font-weight:600;font-size:0.9rem;" id="stoicTitle"></span>
                            <span style="color:#64748b;font-size:0.8rem;margin-left:6px;" id="stoicAuthor"></span>
                        </div>
                        <blockquote style="font-style:italic;color:#e2e8f0;font-size:1.05rem;line-height:1.6;border-left:3px solid #f59e0b;padding-left:16px;margin:12px 0;" id="stoicText"></blockquote>
                        <p style="color:#cbd5e1;font-size:0.9rem;line-height:1.6;margin-top:8px;" id="stoicReflection"></p>
                    </div>
                </div>

                <div class="module-card module-full">
                    <div class="card-label">TODAY'S PRIORITIES</div>
                    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
                        <h2 style="margin:0;">5 Things to Focus On</h2>
                        <div style="display:flex;gap:8px;">
                            ${!missionState.approved ? `
                                <button id="approvePriorities" class="mission-action-btn" style="background:rgba(34,197,94,.15);color:#22c55e;border:1px solid rgba(34,197,94,.3);">
                                    APPROVE ORDER
                                </button>
                            ` : `
                                <span style="color:#22c55e;font-size:0.85rem;font-weight:600;">✓ Approved</span>
                            `}
                        </div>
                    </div>
                    <p style="color:#8899aa;font-size:0.8rem;margin-bottom:16px;">
                        ${missionState.approved
                            ? "Priorities locked for today. JARVIS is learning your preferences."
                            : "Drag to reorder, then approve. JARVIS learns what you value most."}
                    </p>
                    <div id="priorityList" class="priority-list">
                        ${displayOrder.map((p, i) => renderPriorityItem(p, i, missionState.approved)).join("")}
                    </div>
                </div>

                ${totalPending > 0 ? `
                <div class="module-card module-full" style="border-left:3px solid #f59e0b;">
                    <div class="card-label" style="color:#f59e0b;">PENDING APPROVALS</div>
                    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
                        <h2 style="margin:0;">${totalPending} Items Need Your Review</h2>
                        <span style="font-size:0.8rem;color:#94a3b8">Sorted by fit score</span>
                    </div>
                    ${junkCount > 0 ? `<div style="font-size:0.75rem;color:#64748b;margin-bottom:10px;padding:6px 10px;background:rgba(100,71,68,0.1);border-radius:6px">${junkCount} empty entries filtered out (no company name)</div>` : ""}

                    ${renderApprovalGroup("Well Noticed Prospects", wellNoticedItems, "#22c55e")}
                    ${renderApprovalGroup("JARVIS Revenue Opportunities", mpoItems, "#8b5cf6")}
                    ${renderApprovalGroup("AVOs", avoItems, "#3b82f6")}
                    ${renderApprovalGroup("Paused Campaigns", campaignItems, "#f59e0b")}
                    ${renderApprovalGroup("System Alerts", systemItems, "#60a5fa")}
                    ${otherItems.length > 0 ? renderApprovalGroup("Other Items", otherItems, "#64748b") : ""}
                </div>
                ` : `
                <div class="module-card module-full">
                    <div class="card-label">PENDING APPROVALS</div>
                    <h2>All Clear</h2>
                    <p style="color:#8899aa;font-size:0.9rem;">No items require your review. JARVIS agents are running smoothly.</p>
                </div>
                `}

                <div class="module-card module-full">
                    <div class="card-label">EXECUTION GUIDANCE</div>
                    <h2>Recommended Approach</h2>
                    <div style="color:#cbd5e1;font-size:0.9rem;line-height:1.6;">
                        <p>Start with the foundation — center yourself before the work. Then move through your priorities in the approved order. JARVIS agents are running in the background, discovering opportunities and advancing campaigns.</p>
                        <p style="margin-top:8px;">${totalPending > 0 ? "Clear the pending approvals above — these prospects are waiting for your decision to enter the pipeline." : "All approvals are current."} Check Agent Hub for detailed agent operations, or Scheduler to run manual discovery.</p>
                    </div>
                </div>

            </div>
        </div>
    `;

    if (!missionState.approved) {
        setupDragAndDrop();
    }

    populateStoicCard();

    document.getElementById("approvePriorities")?.addEventListener("click", approvePriorities);
}

function renderApprovalGroup(label, items, accentColor) {
    if (!items || items.length === 0) return "";
    const batchIds = items.filter(i => i.approvalId).map(i => i.approvalId).join(",");
    return `
        <div class="approval-group" style="border-left:3px solid ${accentColor};">
            <div class="approval-group-header">
                <h3>${label} (${items.length})</h3>
                ${batchIds ? `
                <div class="batch-actions">
                    <button class="mission-action-btn btn-approve" onclick="window.__batchApprove('${batchIds}')" style="font-size:0.75em;padding:5px 10px">APPROVE ALL</button>
                    <button class="mission-action-btn btn-deny" onclick="window.__batchDeny('${batchIds}')" style="font-size:0.75em;padding:5px 10px">DENY ALL</button>
                </div>` : ""}
            </div>
            ${items.map(item => renderApprovalItem(item)).join("")}
        </div>
    `;
}

function renderApprovalItem(item) {
    const pd = item.prospectDetails || {};
    const name = pd.name || item.title || "Unknown";
    const fitScore = pd.fitScore || 0;
    const fitGrade = pd.fitGrade || (fitScore >= 70 ? "high" : fitScore >= 40 ? "medium" : "low");
    const fitClass = fitGrade === "high" ? "fit-high" : fitGrade === "medium" ? "fit-med" : "fit-low";
    const website = pd.website || "";
    const email = pd.email || "";
    const city = pd.city || "";
    const state = pd.state || "";
    const category = pd.category || "";
    const execName = pd.executiveName || "";
    const opp = item.opportunity || {};
    const isSearchPhrase = !website && !email && !city && (name.toLowerCase().includes(" in ") || name.toLowerCase().includes(" top ") || name.toLowerCase().includes(" best ") || name.match(/^\d+ (best|top)/));

    const buttonsHtml = item.buttons ? item.buttons.map(btn => {
        switch (btn) {
            case "enrich": return `<button class="mission-action-btn btn-enrich" onclick="window.__enrichAction('${item.approvalId}')">ENRICH</button>`;
            case "approve": return `<button class="mission-action-btn btn-approve" onclick="window.__approveAction('${item.approvalId}')">APPROVE</button>`;
            case "deny": return `<button class="mission-action-btn btn-deny" onclick="window.__denyAction('${item.approvalId}')">DENY</button>`;
            case "resume": return `<button class="mission-action-btn btn-resume" onclick="window.__resumeAction('${item.campaignId}')">RESUME</button>`;
            case "close": return `<button class="mission-action-btn btn-close" onclick="window.__closeAction('${item.campaignId}')">CLOSE</button>`;
            case "resolve": return `<button class="mission-action-btn btn-resolve" onclick="window.__resolveAction('${item.escalationId}')">RESOLVE</button>`;
            case "accept": return `<button class="mission-action-btn btn-accept" onclick="window.__acceptVentureCandidate('${item.candidateId}')">ACCEPT</button>`;
            case "defer": return `<button class="mission-action-btn btn-defer" onclick="window.__deferVentureCandidate('${item.candidateId}')">DEFER</button>`;
            case "reject": return `<button class="mission-action-btn btn-reject" onclick="window.__rejectVentureCandidate('${item.candidateId}')">REJECT</button>`;
            case "launch": return `<button class="mission-action-btn btn-approve" onclick="window.__launchAvo('${item.avoId}')">LAUNCH</button>`;
            case "close": return item.avoId
                ? `<button class="mission-action-btn btn-close" onclick="window.__closeAvo('${item.avoId}')">CLOSE</button>`
                : `<button class="mission-action-btn btn-close" onclick="window.__closeAction('${item.campaignId}')">CLOSE</button>`;
            default: return "";
        }
    }).join("") : "";

    const sourceBadge = item.sourceLabel ? `<span style="font-size:0.72em;color:#64748b;background:rgba(255,255,255,0.05);padding:2px 8px;border-radius:4px;margin-left:8px">${escapeMission(item.sourceLabel)}</span>` : "";

    const fitBadge = fitScore > 0 ? `<span class="${fitClass}" style="font-weight:700;font-size:0.85em;margin-left:8px">Fit: ${fitScore}/100</span>` : "";
    const searchFlag = isSearchPhrase ? `<span style="font-size:0.7em;color:#f59e0b;background:rgba(245,158,11,0.12);padding:1px 6px;border-radius:3px;margin-left:8px;vertical-align:middle">SEARCH PHRASE</span>` : "";

    return `
        <div class="approval-item" data-approval-id="${item.approvalId || ""}">
            <div class="approval-item-info">
                <div class="name">
                    ${escapeMission(name)}
                    ${fitBadge}
                    ${searchFlag}
                    ${sourceBadge}
                </div>
                <div class="meta" style="margin-top:4px">
                    ${category ? `<span>${escapeMission(category)}</span>` : ""}
                    ${city ? `<span>${escapeMission(city)}${state ? ", " + escapeMission(state) : ""}</span>` : ""}
                    ${item.subtitle ? `<span>${escapeMission(item.subtitle)}</span>` : ""}
                </div>
                ${item.description ? `<div class="details">${escapeMission(item.description)}</div>` : ""}
                ${opp.capability ? `<div class="details" style="color:#8b5cf6">${escapeMission(opp.capability)}${opp.service ? " — " + escapeMission(opp.service) : ""}</div>` : ""}
                ${email ? `<div class="email">✉ ${escapeMission(email)}</div>` : ""}
                ${execName ? `<div class="details" style="color:#60a5fa">👤 ${escapeMission(execName)}</div>` : ""}
                ${website ? `<div class="website"><a href="${escapeMission(website)}" target="_blank" rel="noopener">${escapeMission(website)}</a></div>` : ""}
                ${!website && !email && !city ? `<div class="details" style="color:#f59e0b;font-style:italic">No contact details — needs enrichment or this may be a search topic, not a company</div>` : ""}
            </div>
            <div class="approval-item-actions">
                ${buttonsHtml}
            </div>
        </div>
    `;
}

function renderPriorityItem(priority, index, locked) {
    const categoryIcons = {
        faith: "\u2726",
        jarvis: "\u26A1",
        venture: "\uD83D\uDCCA",
        execution: "\uD83C\uDFAF",
        governance: "\u2696\uFE0F"
    };

    const categoryColors = {
        faith: "#a78bfa",
        jarvis: "#4da3ff",
        venture: "#22c55e",
        execution: "#f59e0b",
        governance: "#f472b6"
    };

    const icon = categoryIcons[priority.category] || "\u2022";
    const color = categoryColors[priority.category] || "#8899aa";

    return `
        <div class="priority-item ${locked ? 'locked' : 'draggable'}"
             data-index="${index}"
             data-category="${priority.category}"
             ${!locked ? 'draggable="true"' : ''}>
            <div class="priority-rank" style="background:${color}22;color:${color};">
                ${index + 1}
            </div>
            <div class="priority-content">
                <div class="priority-header">
                    <span class="priority-icon">${icon}</span>
                    <span class="priority-category" style="color:${color};">${priority.category.toUpperCase()}</span>
                    ${priority.source === "system" ? '<span class="priority-source">AUTO</span>' : ""}
                </div>
                <div class="priority-title">${escapeMission(priority.title)}</div>
                <div class="priority-detail">${escapeMission(priority.detail)}</div>
                ${priority.verse ? `<div class="priority-verse" style="font-style:italic;color:#a78bfa;font-size:0.8rem;margin-top:6px;">"${escapeMission(priority.verse)}"</div>` : ""}
                ${priority.reference ? `<div class="priority-reference" style="color:#a78bfa;font-size:0.75rem;">— ${escapeMission(priority.reference)}</div>` : ""}
            </div>
            ${!locked ? '<div class="priority-handle">\u22EE\u22EE</div>' : ""}
        </div>
    `;
}

function populateStoicCard() {
    const stoicReadings = [
        { author: "Marcus Aurelius", title: "On Control", text: "You have power over your mind — not outside events. Realize this, and you will find strength.", reflection: "Focus only on what is within your control: your thoughts, your actions, your character. Release the rest." },
        { author: "Seneca", title: "On Time", text: "It is not that we have a short time to live, but that we waste a great deal of it.", reflection: "Time is your most precious resource. Spend it intentionally, not by default." },
        { author: "Epictetus", title: "On Obstacles", text: "The impediment to action advances action. What stands in the way becomes the way.", reflection: "Every obstacle is an opportunity to practice virtue — patience, courage, creativity." },
        { author: "Marcus Aurelius", title: "On Morning", text: "When you arise in the morning, think of what a privilege it is to be alive — to think, to enjoy, to love.", reflection: "Begin each day with gratitude. The mere fact of waking is a gift." },
        { author: "Seneca", title: "On Adversity", text: "Difficulties strengthen the mind, as labor does the body.", reflection: "Hardship is not punishment — it is training. Embrace it as a sculptor embraces stone." },
        { author: "Epictetus", title: "On Freedom", text: "No man is free who is not master of himself.", reflection: "True freedom is self-mastery — the ability to govern your desires and emotions." },
        { author: "Marcus Aurelius", title: "On Kindness", text: "The best revenge is to be unlike him who performed the injury.", reflection: "Respond to cruelty with compassion. Rise above the behavior that provoked you." },
        { author: "Seneca", title: "On Friendship", text: "Associate with people who are likely to improve you.", reflection: "Your companions shape your character. Choose those who elevate you." },
        { author: "Epictetus", title: "On Peace", text: "Man is not worried by real problems so much as by his imagined anxieties about real problems.", reflection: "Most of your suffering comes from your interpretation, not the event itself." },
        { author: "Marcus Aurelius", title: "On Death", text: "Think of yourself as dead. You have lived your life. Now, take what's left and live it properly.", reflection: "Memento mori — remembering death clarifies what truly matters." },
        { author: "Seneca", title: "On Simplicity", text: "It is not the man who has too little, but the man who craves more, that is poor.", reflection: "Contentment is not about having less — it is about needing less." },
        { author: "Epictetus", title: "On Anger", text: "Any person capable of angering you becomes your master.", reflection: "Anger is a surrender of your peace. Guard it fiercely." },
        { author: "Marcus Aurelius", title: "On Duty", text: "Never esteem anything as of advantage to you that will make you break your word or lose your self-respect.", reflection: "Your integrity is the one thing that cannot be taken from you. Protect it." },
        { author: "Seneca", title: "On Fortune", text: "We suffer more in imagination than in reality.", reflection: "The things you fear most rarely happen. Meet reality as it is, not as you imagine it." },
        { author: "Epictetus", title: "On Learning", text: "It is impossible for a man to learn what he thinks he already knows.", reflection: "Approach every day as a student. Humility is the beginning of wisdom." },
        { author: "Marcus Aurelius", title: "On Perspective", text: "How much more grievous are the consequences of anger than the causes of it.", reflection: "Step back. See the larger picture. Most provocations are trivial in the long run." },
        { author: "Seneca", title: "On Rest", text: "Rest is not idleness; it is the recollection of strength.", reflection: "Even the mind needs rest. A weary mind makes poor decisions." },
        { author: "Epictetus", title: "On Gratitude", text: "He who is not contented with what he has, would not be contented with what he would like to have.", reflection: "Gratitude is the foundation of happiness. Start here." },
        { author: "Marcus Aurelius", title: "On Character", text: "Waste no more time arguing about what a good man should be. Be one.", reflection: "Action defines character. Stop debating and start living your values." },
        { author: "Seneca", title: "On Presence", text: "True happiness is to enjoy the present, without anxious dependence upon the future.", reflection: "The past is gone. The future is uncertain. This moment is all you have." },
        { author: "Epictetus", title: "On Purpose", text: "First say to yourself what you would be; and then do what you have to do.", reflection: "Clarity of purpose precedes effective action. Define your target, then aim." },
        { author: "Marcus Aurelius", title: "On Nature", text: "Everything that happens happens as it should, and if you observe carefully, you will find this so.", reflection: "Trust the process of life. What seems chaotic often has hidden order." },
        { author: "Seneca", title: "On Luck", text: "Luck is what happens when preparation meets opportunity.", reflection: "You cannot control luck, but you can prepare yourself to recognize and seize opportunity." },
        { author: "Epictetus", title: "On Worry", text: "He is a wise man who does not grieve for the things which he has not, but rejoices for those which he has.", reflection: "Count your possessions, not your deficiencies." },
        { author: "Marcus Aurelius", title: "On Ego", text: "Throw away your opinions, and you throw away your complaints.", reflection: "Your opinions create your suffering. Hold them loosely." },
        { author: "Seneca", title: "On Silence", text: "Silence is a lesson learned through life's many sufferings.", reflection: "In silence, you hear truth. In noise, you hear distraction." },
        { author: "Epictetus", title: "On Fear", text: "The only thing that can trouble us is our own judgment about things.", reflection: "Fear is a product of thought, not of reality. Examine the source." },
        { author: "Marcus Aurelius", title: "On Community", text: "What is not good for the beehive is not good for the bee.", reflection: "We are made for cooperation. Your flourishing is tied to others'." },
        { author: "Seneca", title: "On Self", text: "To be everywhere is to be nowhere.", reflection: "Scattered attention produces scattered results. Be fully where you are." },
        { author: "Epictetus", title: "On Decisions", text: "It is our responsibility to choose the best course of action and then let the outcome be what it will.", reflection: "Do your best, release the rest. The outcome is never fully in your hands." },
        { author: "Marcus Aurelius", title: "On Focus", text: "Never let the future disturb you. You will meet it, if you have to, with the same weapons of reason.", reflection: "You already possess everything you need to face tomorrow." },
        { author: "Seneca", title: "On Wisdom", text: "A wise man will make more opportunities than he finds.", reflection: "Don't wait for the perfect moment. Create it." },
        { author: "Epictetus", title: "On Emotion", text: "It's not what happens to you, but how you react to it that matters.", reflection: "Between stimulus and response lies your power. Use it." },
        { author: "Marcus Aurelius", title: "On Justice", text: "The best way to avenge yourself is not to become like the wrongdoer.", reflection: "Justice does not require retaliation. It requires integrity." },
        { author: "Seneca", title: "On Moderation", text: "Moderation in all things.", reflection: "Excess in anything becomes a deficiency. Seek the middle path." },
        { author: "Epictetus", title: "On Patience", text: "Patience is not passive waiting — it is active endurance with purpose.", reflection: "The obstacle is the way. Endure with purpose." },
        { author: "Marcus Aurelius", title: "On Service", text: "The fruit of this life is good character and acts for the common good.", reflection: "Your life finds meaning in service to others. This is your purpose." },
        { author: "Seneca", title: "On Travel", text: "The man who travels abroad returns home changed — or has not truly traveled at all.", reflection: "Travel is not about miles covered. It is about perspectives gained." },
        { author: "Epictetus", title: "On Honesty", text: "He who does not steal from himself is truly wealthy.", reflection: "Dishonesty robs you of yourself. Integrity is your true wealth." }
    ];
    const today = new Date();
    const start = new Date(today.getFullYear(), 0, 0);
    const dayOfYear = Math.floor((today - start) / 86400000);
    const reading = stoicReadings[dayOfYear % stoicReadings.length];

    const titleEl = document.getElementById("stoicTitle");
    const authorEl = document.getElementById("stoicAuthor");
    const textEl = document.getElementById("stoicText");
    const reflectionEl = document.getElementById("stoicReflection");
    if (titleEl) titleEl.textContent = reading.title;
    if (authorEl) authorEl.textContent = "\u2014 " + reading.author;
    if (textEl) textEl.textContent = "\u201C" + reading.text + "\u201D";
    if (reflectionEl) reflectionEl.textContent = reading.reflection;
}

function setupDragAndDrop() {
    const list = document.getElementById("priorityList");
    if (!list) return;

    let draggedEl = null;
    let draggedIndex = -1;
    let placeholder = null;

    list.querySelectorAll(".priority-item.draggable").forEach(item => {
        item.addEventListener("dragstart", (e) => {
            draggedEl = item;
            draggedIndex = Number(item.dataset.index);
            item.classList.add("dragging");
            item.style.opacity = "0.4";
            e.dataTransfer.effectAllowed = "move";
            e.dataTransfer.setData("text/plain", draggedIndex.toString());

            placeholder = document.createElement("div");
            placeholder.className = "drag-placeholder";
            placeholder.style.cssText = "height:4px;background:#4da3ff;border-radius:2px;margin:4px 0;transition:all .15s;";
        });

        item.addEventListener("dragend", () => {
            item.classList.remove("dragging");
            item.style.opacity = "1";
            if (placeholder && placeholder.parentNode) {
                placeholder.parentNode.removeChild(placeholder);
            }
            draggedEl = null;
            draggedIndex = -1;
            placeholder = null;

            list.querySelectorAll(".priority-item").forEach(el => {
                el.style.borderTop = "";
                el.style.borderBottom = "";
            });
        });

        item.addEventListener("dragover", (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";

            if (item === draggedEl) return;

            const rect = item.getBoundingClientRect();
            const midY = rect.top + rect.height / 2;

            list.querySelectorAll(".priority-item").forEach(el => {
                el.style.borderTop = "";
                el.style.borderBottom = "";
            });

            if (e.clientY < midY) {
                item.style.borderTop = "2px solid #4da3ff";
            } else {
                item.style.borderBottom = "2px solid #4da3ff";
            }
        });

        item.addEventListener("dragleave", () => {
            item.style.borderTop = "";
            item.style.borderBottom = "";
        });

        item.addEventListener("drop", (e) => {
            e.preventDefault();
            if (draggedIndex === -1 || item === draggedEl) return;

            const targetIndex = Number(item.dataset.index);
            const rect = item.getBoundingClientRect();
            const midY = rect.top + rect.height / 2;
            const insertBefore = e.clientY < midY;

            const movedItem = missionState.userOrder.splice(draggedIndex, 1)[0];
            let newIndex = insertBefore ? targetIndex : targetIndex;
            if (draggedIndex < targetIndex) newIndex--;
            missionState.userOrder.splice(newIndex, 0, movedItem);

            renderMission(missionState.priorities, [], missionState.todayActions || []);
            setupDragAndDrop();
        });
    });
}

async function approvePriorities() {
    const btn = document.getElementById("approvePriorities");
    if (btn) {
        btn.disabled = true;
        btn.textContent = "APPROVING...";
    }

    try {
        const adjustments = missionState.userOrder.map((p, i) => {
            const original = missionState.originalOrder.find(o => o.title === p.title);
            return {
                title: p.title,
                category: p.category,
                originalRank: original?.rank || i + 1,
                newRank: i + 1,
                delta: (original?.rank || i + 1) - (i + 1)
            };
        });

        const response = await missionFetch("/api/daily-priorities/approve", {
            method: "POST",
            body: JSON.stringify({
                date: missionState.priorities.date,
                priorities: missionState.originalOrder,
                userOrder: missionState.userOrder,
                adjustments
            })
        });

        if (response.ok) {
            missionState.approved = true;

            const freshResponse = await missionFetch("/api/daily-priorities");
            if (freshResponse.ok) {
                const freshData = await freshResponse.json();
                if (freshData.priorities) {
                    missionState.priorities = freshData.priorities;
                    missionState.userOrder = freshData.priorities.priorities;
                    missionState.originalOrder = freshData.priorities.priorities;
                }
            }

            renderMission(missionState.priorities, [], missionState.todayActions || []);
        } else {
            throw new Error("Failed to record approval");
        }
    } catch (error) {
        console.error("Approval failed:", error);
        alert("Failed to record approval. Please try again.");
        if (btn) {
            btn.disabled = false;
            btn.textContent = "APPROVE ORDER";
        }
    }
}

window.__approveAction = async function(approvalId) {
    if (!approvalId) return;
    const item = document.querySelector(`[data-approval-id="${approvalId}"]`);
    if (item) item.style.opacity = "0.5";
    try {
        const overrides = {};
        const additionalContacts = [];

        const saveR = await missionFetch(`/api/today-actions/save-edits/${approvalId}`, {
            method: "POST",
            body: JSON.stringify({ prospectOverrides: overrides, additionalContacts })
        });
        if (!saveR.ok) {
            const e = await saveR.json().catch(() => ({}));
            throw new Error(e.error || "Failed to load prospect data");
        }

        const hasEmail = !!(overrides.email?.trim());
        const cadenceType = hasEmail ? "standard" : "noemail";

        const r = await missionFetch(`/api/today-actions/preview-cadence/${approvalId}?type=${cadenceType}`);
        if (!r.ok) {
            const e = await r.json().catch(() => ({}));
            throw new Error(e.error || "Failed to load cadence preview");
        }
        const d = await r.json();
        const data = d.data || {};
        if (item) item.style.opacity = "1";

        const prospect = data.prospect || {};
        const mergedOverrides = {
            name: prospect.name || overrides.name || "",
            email: prospect.email || overrides.email || "",
            phone: prospect.phone || overrides.phone || "",
            executiveName: prospect.executiveName || overrides.executiveName || "",
            executiveTitle: prospect.executiveTitle || overrides.executiveTitle || "",
            website: prospect.website || overrides.website || ""
        };
        window._lastCadenceData = { approvalId, overrides: mergedOverrides, additionalContacts, cadenceType };

        renderCadenceConfirmationModal(approvalId, mergedOverrides, additionalContacts, data);
    } catch (e) {
        if (item) item.style.opacity = "1";
        alert("Failed to load cadence: " + e.message);
    }
};

function renderCadenceModal(approvalId, data) {
    const prospect = data.prospect || {};
    const preview = data.campaignPreview;
    const hasContact = data.hasContact;
    const steps = preview?.steps || [];

    const existing = document.getElementById("cadence-modal-overlay");
    if (existing) existing.remove();

    const stepsHtml = steps.map((step, i) => {
        const delayLabel = step.delayDays === 0 ? "Day 0" : `Day ${step.delayDays}`;
        const channelIcon = step.channel === "email" ? "✉" : step.channel === "website-contact-form" ? "🌐" : step.channel === "linkedin" ? "🔗" : "•";
        const message = step.message || "";
        const subject = step.subject || "";
        const isEmailStep = step.channel === "email";
        const noEmailWarning = isEmailStep && !prospect.email ? `<div style="color:#f59e0b;font-size:0.8em;margin-top:4px;font-style:italic">No email — this step will be skipped</div>` : "";
        return `
            <div class="cadence-step" style="border-left:3px solid ${i === 0 ? "#22c55e" : i === steps.length - 1 ? "#f59e0b" : "#4da3ff"};padding:12px 16px;background:rgba(255,255,255,0.03);border-radius:8px;margin-bottom:8px;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                    <div style="display:flex;align-items:center;gap:8px;">
                        <span style="font-weight:700;color:${i === 0 ? "#22c55e" : i === steps.length - 1 ? "#f59e0b" : "#4da3ff"};font-size:0.85em;">Step ${step.step}</span>
                        <span style="font-size:0.85em;color:#94a3b8;">${channelIcon} ${step.name}</span>
                        <span style="font-size:0.75em;color:#64748b;background:rgba(255,255,255,0.05);padding:2px 6px;border-radius:4px;">${delayLabel}</span>
                    </div>
                    <span style="font-size:0.75em;color:#64748b;background:rgba(255,255,255,0.05);padding:2px 8px;border-radius:4px;text-transform:capitalize;">${step.channel}</span>
                </div>
                ${subject ? `<div style="font-size:0.85em;color:#cbd5e1;margin-bottom:2px;"><span style="color:#64748b;">Subject:</span> ${escapeMission(subject)}</div>` : ""}
                ${message ? `<div style="font-size:0.8em;color:#8899aa;line-height:1.4;max-height:60px;overflow:hidden;cursor:pointer" onclick="this.style.maxHeight=this.style.maxHeight==='60px'?'none':'60px'" title="Click to expand/collapse">${escapeMission(message.slice(0, 300))}${message.length > 300 ? "..." : ""}</div>` : ""}
                ${noEmailWarning}
            </div>
        `;
    }).join("");

    const contactHtml = `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;padding:16px;background:rgba(255,255,255,0.03);border-radius:10px;border:1px solid rgba(255,255,255,0.06);">
            <div>
                <div style="font-size:0.7em;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:2px;">Company</div>
                <div style="font-weight:600;color:#e2e8f0;">${escapeMission(prospect.name)}</div>
                ${prospect.category ? `<div style="font-size:0.8em;color:#94a3b8;margin-top:2px;">${escapeMission(prospect.category)}</div>` : ""}
            </div>
            <div style="text-align:right;">
                <div style="font-size:0.7em;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:2px;">Fit Score</div>
                <div style="font-weight:700;font-size:1.1em;color:${prospect.fitScore >= 60 ? "#22c55e" : prospect.fitScore >= 40 ? "#f59e0b" : "#ef4444"};">${prospect.fitScore}/100</div>
            </div>
            <div>
                <div style="font-size:0.7em;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:2px;">Contact</div>
                ${prospect.executiveName ? `<div style="color:#60a5fa;font-size:0.9em;">👤 ${escapeMission(prospect.executiveName)}${prospect.executiveTitle ? ", " + escapeMission(prospect.executiveTitle) : ""}</div>` : `<div style="color:#f59e0b;font-size:0.85em;font-style:italic;">No contact found — enrich first</div>`}
                ${prospect.email ? `<div style="color:#22c55e;font-size:0.85em;margin-top:2px;">✉ ${escapeMission(prospect.email)}</div>` : `<div style="color:#f59e0b;font-size:0.85em;margin-top:2px;">✉ No email</div>`}
                ${prospect.phone ? `<div style="color:#94a3b8;font-size:0.85em;margin-top:2px;">📞 ${escapeMission(prospect.phone)}</div>` : ""}
            </div>
            <div>
                <div style="font-size:0.7em;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:2px;">Location</div>
                <div style="color:#e2e8f0;font-size:0.9em;">${prospect.city ? `${escapeMission(prospect.city)}, ${escapeMission(prospect.state || "OH")}` : "Columbus, OH"}</div>
                ${prospect.website ? `<div style="font-size:0.8em;margin-top:2px;"><a href="${escapeMission(prospect.website)}" target="_blank" rel="noopener" style="color:#60a5fa;text-decoration:none;">${escapeMission(prospect.website)}</a></div>` : ""}
            </div>
        </div>
    `;

    const missingContactBanner = !hasContact ? `
        <div style="padding:12px 16px;background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.3);border-radius:8px;margin-bottom:16px;display:flex;justify-content:space-between;align-items:center;">
            <div>
                <div style="font-weight:600;color:#f59e0b;">No contact info found</div>
                <div style="font-size:0.85em;color:#fcd34d;">Enrich this prospect first to find email, phone, and executive details. The cadence will still be created but email steps will be skipped.</div>
            </div>
            <button class="mission-action-btn btn-enrich" onclick="window.closeCadenceModal(); window.__enrichAction('${approvalId}')" style="white-space:nowrap;">ENRICH FIRST</button>
        </div>
    ` : "";

    const previewErrorHtml = data.previewError ? `
        <div style="padding:8px 12px;background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);border-radius:6px;margin-bottom:12px;font-size:0.85em;color:#fca5a5;">
            Cadence preview unavailable: ${escapeMission(data.previewError)}
        </div>
    ` : "";

    const modal = document.createElement("div");
    modal.id = "cadence-modal-overlay";
    modal.style.cssText = "position:fixed;top:0;left:0;right:0;bottom:0;z-index:9999;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);padding:20px;";

    modal.innerHTML = `
        <div class="cadence-modal" style="background:linear-gradient(145deg,#111923,#0b1017);border:1px solid rgba(255,255,255,0.1);border-radius:16px;max-width:700px;width:100%;max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.5);">
            <div style="position:sticky;top:0;background:inherit;border-radius:16px 16px 0 0;padding:20px 24px 16px;display:flex;justify-content:space-between;align-items:flex-start;border-bottom:1px solid rgba(255,255,255,0.06);z-index:1;">
                <div>
                    <div style="font-size:0.7em;color:#64748b;text-transform:uppercase;letter-spacing:0.08em;">CADENCE PREVIEW</div>
                    <h2 style="margin:4px 0 0;font-size:1.2em;color:#e2e8f0;">Well Noticed Outreach</h2>
                    <span style="font-size:0.8em;color:#94a3b8;">${preview?.totalDurationDays || 20} day cadence · ${steps.length} touches</span>
                </div>
                <button onclick="window.closeCadenceModal()" style="background:none;border:1px solid rgba(255,255,255,0.1);color:#94a3b8;font-size:1.2em;cursor:pointer;padding:4px 10px;border-radius:6px;line-height:1;">✕</button>
            </div>

            <div style="padding:20px 24px;">
                ${contactHtml}
                ${previewErrorHtml}
                ${missingContactBanner}

                <div style="margin-bottom:12px;">
                    <div style="font-size:0.75em;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px;">Outreach Timeline</div>
                    ${steps.length > 0 ? stepsHtml : `<div style="color:#64748b;font-size:0.9em;padding:12px;text-align:center;font-style:italic;">No cadence steps defined for template</div>`}
                </div>

                <div style="margin-top:20px;display:flex;gap:10px;justify-content:flex-end;padding-top:16px;border-top:1px solid rgba(255,255,255,0.06);">
                    <button class="mission-action-btn btn-deny" onclick="window.closeCadenceModal()" style="padding:10px 24px;">CANCEL</button>
                    <button class="mission-action-btn btn-approve" onclick="window.confirmAndApprove('${approvalId}')" style="padding:10px 24px;font-weight:700;">✓ APPROVE & START CADENCE</button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    modal.addEventListener("click", (e) => {
        if (e.target === modal) closeCadenceModal();
    });
}

window.closeCadenceModal = function() {
    ["cadence-modal-overlay", "enrich-modal-overlay"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.remove();
    });
};

window.confirmAndApprove = async function(approvalId) {
    if (!approvalId) return;
    const item = document.querySelector(`[data-approval-id="${approvalId}"]`);
    closeCadenceModal();
    if (item) item.style.opacity = "0.5";
    try {
        const r = await missionFetch(`/api/today-actions/approve/${approvalId}`, {
            method: "POST",
            body: JSON.stringify({ confirmation: "APPROVE", approvedBy: "owner" })
        });
        const p = await r.json();
        if (!r.ok) throw new Error(p.error || "Approve failed");
        if (item) {
            const campaigns = Array.isArray(p.execution?.campaign) ? p.execution.campaign : (p.execution?.campaign ? [p.execution.campaign] : []);
            const activeCount = campaigns.filter(c => c?.created).length;
            const note = p.execution?.note || (activeCount > 0 ? `${activeCount} campaign(s) active` : "see details in CRM");
            item.innerHTML = `<div style="padding:14px;background:#0f2918;border-radius:8px;border:1px solid #22c55e;width:100%"><div style="font-weight:600;color:#22c55e;margin-bottom:4px">✅ Approved & Added to CRM</div><div style="font-size:0.85em;color:#a9f5d7">${escapeMission(note)}</div></div>`;
        }
    } catch (e) {
        if (item) item.style.opacity = "1";
        alert("Approve failed: " + e.message);
    }
};

window.__denyAction = async function(approvalId) {
    if (!approvalId) return;
    const reason = prompt("Reason for denying (optional):");
    if (reason === null) return;
    const item = document.querySelector(`[data-approval-id="${approvalId}"]`);
    if (item) item.style.opacity = "0.5";
    try {
        const r = await missionFetch(`/api/today-actions/deny/${approvalId}`, {
            method: "POST",
            body: JSON.stringify({ confirmation: "DENY", reason, deniedBy: "owner" })
        });
        const p = await r.json();
        if (!r.ok) throw new Error(p.error || "Deny failed");
        if (item) item.innerHTML = `<div style="padding:14px;background:#291010;border-radius:8px;border:1px solid #ef4444;width:100%"><div style="font-weight:600;color:#ef4444;">Denied</div></div>`;
    } catch (e) {
        if (item) item.style.opacity = "1";
        alert("Deny failed: " + e.message);
    }
};

window.__enrichAction = async function(approvalId) {
    if (!approvalId) return;
    const item = document.querySelector(`[data-approval-id="${approvalId}"]`);
    if (item) item.style.opacity = "0.5";
    try {
        const r = await missionFetch(`/api/today-actions/enrich/${approvalId}`, {
            method: "POST",
            body: JSON.stringify({})
        });
        const p = await r.json();
        if (!r.ok) throw new Error(p.error || "Enrich failed");
        if (item) item.style.opacity = "1";
        _lastEnrichData = { approvalId, data: p.data || {} };
        renderEnrichModal(approvalId, p.data || {});
    } catch (e) {
        if (item) item.style.opacity = "1";
        alert("Enrich failed: " + e.message);
    }
};

function renderEnrichModal(approvalId, data) {
    const enrich = data.enrichment || {};
    const existing = document.getElementById("cadence-modal-overlay");
    if (existing) existing.remove();

    const sourcesHtml = (enrich.sources || []).length > 0 ? `
        <div style="margin-top:8px;">
            <div style="font-size:0.7em;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px;">Sources</div>
            ${enrich.sources.map(s => `<div style="font-size:0.8em;color:#94a3b8;margin:2px 0;">• ${s.type}${s.url ? `: <a href="${s.url}" target="_blank" style="color:#60a5fa;text-decoration:none;font-size:0.85em;">${s.url.slice(0,60)}</a>` : ""}</div>`).join("")}
        </div>
    ` : "";

    const modal = document.createElement("div");
    modal.id = "cadence-modal-overlay";
    modal.style.cssText = "position:fixed;top:0;left:0;right:0;bottom:0;z-index:9999;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);padding:20px;";

    let companyName = enrich.correctedName || data.originalName || "";
    let companyEmail = enrich.email || "";
    let companyPhone = enrich.phone || "";
    let companyExec = enrich.executiveName || "";
    let companyExecTitle = enrich.executiveTitle || "";
    let companyWebsite = enrich.website || "";
    let companyCity = enrich.city || "";
    let companyState = enrich.state || "OH";
    let companyCategory = enrich.category || "";
    let companyFitScore = enrich.fitScore || 0;
    let companyGoogleReviews = enrich.googleReviewCount || 0;
    let companySourceUrl = enrich.sourceUrl || "";
    let additionalEmails = enrich.additionalEmails || [];

    const additionalContactsHtml = additionalEmails.length > 0 ? additionalEmails.map((email, i) => `
        <div style="border-top:1px solid rgba(255,255,255,0.06);padding-top:14px;margin-top:14px;">
            <div style="font-size:0.7em;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px;">Additional Contact ${i + 1}</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                <div>
                    <label style="font-size:0.7em;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;display:block;margin-bottom:3px;">Email</label>
                    <input id="enrich-email-${i + 1}" type="email" value="${escapeMission(email)}" placeholder="email@company.com" style="width:100%;padding:8px 12px;background:#0b1017;border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:#e2e8f0;font-size:0.9em;outline:none;box-sizing:border-box;">
                </div>
                <div>
                    <label style="font-size:0.7em;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;display:block;margin-bottom:3px;">Contact Name</label>
                    <input id="enrich-name-${i + 1}" type="text" value="" placeholder="e.g. John Smith" style="width:100%;padding:8px 12px;background:#0b1017;border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:#e2e8f0;font-size:0.9em;outline:none;box-sizing:border-box;">
                </div>
            </div>
        </div>
    `).join("") : "";

    modal.innerHTML = `
        <div class="cadence-modal" style="background:linear-gradient(145deg,#111923,#0b1017);border:1px solid rgba(255,255,255,0.1);border-radius:16px;max-width:680px;width:100%;max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.5);">
            <div style="position:sticky;top:0;background:inherit;border-radius:16px 16px 0 0;padding:20px 24px 16px;display:flex;justify-content:space-between;align-items:flex-start;border-bottom:1px solid rgba(255,255,255,0.06);z-index:1;">
                <div>
                    <div style="font-size:0.7em;color:#64748b;text-transform:uppercase;letter-spacing:0.08em;">STEP 1 OF 2</div>
                    <h2 style="margin:4px 0 0;font-size:1.2em;color:#e2e8f0;">Review Enriched Data</h2>
                    <span style="font-size:0.8em;color:#94a3b8;">All fields Jarvis found — correct any, then add to cadence</span>
                </div>
                <button onclick="window.closeCadenceModal()" style="background:none;border:1px solid rgba(255,255,255,0.1);color:#94a3b8;font-size:1.2em;cursor:pointer;padding:4px 10px;border-radius:6px;line-height:1;">✕</button>
            </div>

            <div style="padding:20px 24px;">
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:16px;">
                    <div style="grid-column:1/-1;">
                        <label style="font-size:0.7em;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;display:block;margin-bottom:3px;">Company Name</label>
                        <input id="enrich-name" type="text" value="${escapeMission(companyName)}" placeholder="Company name" style="width:100%;padding:8px 12px;background:#0b1017;border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:#e2e8f0;font-size:0.95em;outline:none;box-sizing:border-box;">
                    </div>
                    <div>
                        <label style="font-size:0.7em;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;display:block;margin-bottom:3px;">Email</label>
                        <input id="enrich-email" type="email" value="${escapeMission(companyEmail)}" placeholder="email@company.com" style="width:100%;padding:8px 12px;background:#0b1017;border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:#e2e8f0;font-size:0.9em;outline:none;box-sizing:border-box;">
                    </div>
                    <div>
                        <label style="font-size:0.7em;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;display:block;margin-bottom:3px;">Phone</label>
                        <input id="enrich-phone" type="text" value="${escapeMission(companyPhone)}" placeholder="(614) 555-0123" style="width:100%;padding:8px 12px;background:#0b1017;border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:#e2e8f0;font-size:0.9em;outline:none;box-sizing:border-box;">
                    </div>
                    <div style="grid-column:1/-1;">
                        <label style="font-size:0.7em;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;display:block;margin-bottom:3px;">Executive Name</label>
                        <input id="enrich-exec" type="text" value="${escapeMission(companyExec)}" placeholder="e.g. John Smith" style="width:100%;padding:8px 12px;background:#0b1017;border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:#e2e8f0;font-size:0.9em;outline:none;box-sizing:border-box;">
                    </div>
                    <div>
                        <label style="font-size:0.7em;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;display:block;margin-bottom:3px;">Executive Title</label>
                        <input id="enrich-title" type="text" value="${escapeMission(companyExecTitle)}" placeholder="Owner / CEO" style="width:100%;padding:8px 12px;background:#0b1017;border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:#e2e8f0;font-size:0.9em;outline:none;box-sizing:border-box;">
                    </div>
                    <div>
                        <label style="font-size:0.7em;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;display:block;margin-bottom:3px;">Website</label>
                        <input id="enrich-website" type="url" value="${escapeMission(companyWebsite)}" placeholder="https://company.com" style="width:100%;padding:8px 12px;background:#0b1017;border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:#e2e8f0;font-size:0.9em;outline:none;box-sizing:border-box;">
                    </div>
                    <div>
                        <label style="font-size:0.7em;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;display:block;margin-bottom:3px;">City</label>
                        <input id="enrich-city" type="text" value="${escapeMission(companyCity)}" placeholder="Columbus" style="width:100%;padding:8px 12px;background:#0b1017;border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:#e2e8f0;font-size:0.9em;outline:none;box-sizing:border-box;">
                    </div>
                    <div>
                        <label style="font-size:0.7em;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;display:block;margin-bottom:3px;">State</label>
                        <input id="enrich-state" type="text" value="${escapeMission(companyState)}" placeholder="OH" style="width:100%;padding:8px 12px;background:#0b1017;border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:#e2e8f0;font-size:0.9em;outline:none;box-sizing:border-box;">
                    </div>
                    <div>
                        <label style="font-size:0.7em;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;display:block;margin-bottom:3px;">Category</label>
                        <input id="enrich-category" type="text" value="${escapeMission(companyCategory)}" placeholder="Category" style="width:100%;padding:8px 12px;background:#0b1017;border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:#e2e8f0;font-size:0.9em;outline:none;box-sizing:border-box;">
                    </div>
                    <div>
                        <label style="font-size:0.7em;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;display:block;margin-bottom:3px;">Fit Score</label>
                        <input id="enrich-fit" type="text" value="${companyFitScore}" placeholder="0" style="width:100%;padding:8px 12px;background:#0b1017;border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:#e2e8f0;font-size:0.9em;outline:none;box-sizing:border-box;">
                    </div>
                    <div>
                        <label style="font-size:0.7em;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;display:block;margin-bottom:3px;">Google Reviews</label>
                        <input id="enrich-reviews" type="text" value="${companyGoogleReviews}" placeholder="0" style="width:100%;padding:8px 12px;background:#0b1017;border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:#e2e8f0;font-size:0.9em;outline:none;box-sizing:border-box;">
                    </div>
                </div>

                ${companySourceUrl ? `<div style="font-size:0.75em;color:#64748b;margin-bottom:12px;">Source: <a href="${escapeMission(companySourceUrl)}" target="_blank" rel="noopener" style="color:#60a5fa;text-decoration:none;">${escapeMission(companySourceUrl)}</a></div>` : ""}

                ${additionalContactsHtml}

                ${sourcesHtml}

                <div style="margin-top:20px;display:flex;gap:10px;justify-content:flex-end;padding-top:16px;border-top:1px solid rgba(255,255,255,0.06);">
                    <button class="mission-action-btn btn-deny" onclick="window.closeCadenceModal()" style="padding:10px 24px;">CANCEL</button>
                    <button class="mission-action-btn btn-enrich" id="enrich-save-btn" onclick="window.saveEdits('${approvalId}')" style="padding:10px 24px;">💾 SAVE EDITS</button>
                    <button class="mission-action-btn btn-approve" id="enrich-add-cadence-btn" onclick="window.addToCadence('${approvalId}')" style="padding:10px 24px;font-weight:700;">✓ ADD TO CADENCE</button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    modal.addEventListener("click", (e) => {
        if (e.target === modal) closeCadenceModal();
    });
}

function renderCadenceConfirmationModal(approvalId, overrides, additionalContacts, previewData) {
    const preview = previewData.campaignPreview || {};
    const steps = preview.steps || [];
    const prospect = previewData.prospect || {};
    const currentCadenceType = previewData.cadenceType || "standard";
    const hasContact = previewData.hasContact || !!(overrides.email || overrides.phone);

    const existing = document.getElementById("cadence-modal-overlay");
    if (existing) existing.remove();

    const stepsHtml = steps.map((step, i) => {
        const delayLabel = step.delayDays === 0 ? "Day 0" : `Day ${step.delayDays}`;
        const channelIcon = step.channel === "email" ? "✉" : step.channel === "website-contact-form" ? "🌐" : step.channel === "linkedin" ? "🔗" : "•";
        const isEmailStep = step.channel === "email";
        const noEmailWarning = isEmailStep && !overrides.email ? `<div style="color:#f59e0b;font-size:0.8em;margin-top:4px;font-style:italic">No email — this step will be skipped</div>` : "";
        return `
            <div class="cadence-step" style="border-left:3px solid ${i === 0 ? "#22c55e" : i === steps.length - 1 ? "#f59e0b" : "#4da3ff"};padding:12px 16px;background:rgba(255,255,255,0.03);border-radius:8px;margin-bottom:8px;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                    <div style="display:flex;align-items:center;gap:8px;">
                        <span style="font-weight:700;color:${i === 0 ? "#22c55e" : i === steps.length - 1 ? "#f59e0b" : "#4da3ff"};font-size:0.85em;">Step ${step.step}</span>
                        <span style="font-size:0.85em;color:#94a3b8;">${channelIcon} ${step.name}</span>
                        <span style="font-size:0.75em;color:#64748b;background:rgba(255,255,255,0.05);padding:2px 6px;border-radius:4px;">${delayLabel}</span>
                    </div>
                </div>
                ${step.channel !== "website-contact-form" && step.channel !== "linkedin" ? `
                    <div style="margin-bottom:4px;">
                        <label style="font-size:0.65em;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;display:block;margin-bottom:2px;">Subject</label>
                        <input id="step-subject-${step.step}" type="text" value="${escapeMission(step.subject || "")}" placeholder="Email subject" style="width:100%;padding:6px 10px;background:#0b1017;border:1px solid rgba(255,255,255,0.08);border-radius:6px;color:#e2e8f0;font-size:0.85em;outline:none;box-sizing:border-box;">
                    </div>
                ` : ""}
                <div>
                    <label style="font-size:0.65em;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;display:block;margin-bottom:2px;">Message</label>
                    <textarea id="step-message-${step.step}" placeholder="Message content" style="width:100%;padding:6px 10px;background:#0b1017;border:1px solid rgba(255,255,255,0.08);border-radius:6px;color:#e2e8f0;font-size:0.8em;outline:none;box-sizing:border-box;min-height:60px;font-family:inherit;resize:vertical;line-height:1.4;">${escapeMission(step.message || "")}</textarea>
                </div>
                ${noEmailWarning}
            </div>
        `;
    }).join("");

    const modal = document.createElement("div");
    modal.id = "cadence-modal-overlay";
    modal.style.cssText = "position:fixed;top:0;left:0;right:0;bottom:0;z-index:9999;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);padding:20px;";

    modal.innerHTML = `
        <div class="cadence-modal" style="background:linear-gradient(145deg,#111923,#0b1017);border:1px solid rgba(255,255,255,0.1);border-radius:16px;max-width:750px;width:100%;max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.5);">
            <div style="position:sticky;top:0;background:inherit;border-radius:16px 16px 0 0;padding:20px 24px 16px;display:flex;justify-content:space-between;align-items:flex-start;border-bottom:1px solid rgba(255,255,255,0.06);z-index:1;">
                <div>
                    <div style="font-size:0.7em;color:#64748b;text-transform:uppercase;letter-spacing:0.08em;">STEP 2 OF 2 — CONFIRM & CUSTOMIZE</div>
                    <h2 style="margin:4px 0 0;font-size:1.2em;color:#e2e8f0;">Final Review: ${escapeMission(overrides.name || "Prospect")}</h2>
                    <span style="font-size:0.8em;color:#94a3b8;">Confirm fields, then edit each step's subject & message before approving</span>
                </div>
                <button onclick="window.closeCadenceModal()" style="background:none;border:1px solid rgba(255,255,255,0.1);color:#94a3b8;font-size:1.2em;cursor:pointer;padding:4px 10px;border-radius:6px;line-height:1;">✕</button>
            </div>

            <div style="padding:20px 24px;">
                <div style="margin-bottom:14px;padding:10px 14px;background:rgba(255,255,255,0.03);border-radius:10px;border:1px solid rgba(255,255,255,0.06);display:flex;align-items:center;gap:12px;">
                    <label style="font-size:0.65em;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;">Cadence Type</label>
                    <select id="cadence-type-select" onchange="window.switchCadenceType('${approvalId}')" style="padding:6px 10px;background:#0b1017;border:1px solid rgba(255,255,255,0.08);border-radius:6px;color:#e2e8f0;font-size:0.85em;outline:none;">
                        <option value="standard" ${currentCadenceType === "standard" ? "selected" : ""}>Standard 5-Touch Cadence</option>
                        <option value="noemail" ${currentCadenceType === "noemail" ? "selected" : ""} ${!hasContact ? "" : ""}>3-Website Ping Cadence</option>
                    </select>
                    ${!hasContact ? `<span style="font-size:0.75em;color:#f59e0b;font-style:italic;">No email or phone — 3-ping suggested</span>` : ""}
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:16px;padding:14px;background:rgba(255,255,255,0.03);border-radius:10px;border:1px solid rgba(255,255,255,0.06);">
                    <div style="grid-column:1/-1;">
                        <div style="font-size:0.65em;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:6px;">Prospect Details — edit before final approval</div>
                    </div>
                    <div>
                        <label style="font-size:0.65em;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;display:block;margin-bottom:2px;">Name</label>
                        <input id="confirm-name" type="text" value="${escapeMission(overrides.name)}" style="width:100%;padding:6px 10px;background:#0b1017;border:1px solid rgba(255,255,255,0.08);border-radius:6px;color:#e2e8f0;font-size:0.85em;outline:none;box-sizing:border-box;">
                    </div>
                    <div>
                        <label style="font-size:0.65em;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;display:block;margin-bottom:2px;">Email</label>
                        <input id="confirm-email" type="email" value="${escapeMission(overrides.email)}" style="width:100%;padding:6px 10px;background:#0b1017;border:1px solid rgba(255,255,255,0.08);border-radius:6px;color:#e2e8f0;font-size:0.85em;outline:none;box-sizing:border-box;">
                    </div>
                    <div>
                        <label style="font-size:0.65em;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;display:block;margin-bottom:2px;">Phone</label>
                        <input id="confirm-phone" type="text" value="${escapeMission(overrides.phone)}" style="width:100%;padding:6px 10px;background:#0b1017;border:1px solid rgba(255,255,255,0.08);border-radius:6px;color:#e2e8f0;font-size:0.85em;outline:none;box-sizing:border-box;">
                    </div>
                    <div>
                        <label style="font-size:0.65em;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;display:block;margin-bottom:2px;">Executive</label>
                        <input id="confirm-exec" type="text" value="${escapeMission(overrides.executiveName)}" style="width:100%;padding:6px 10px;background:#0b1017;border:1px solid rgba(255,255,255,0.08);border-radius:6px;color:#e2e8f0;font-size:0.85em;outline:none;box-sizing:border-box;">
                    </div>
                    <div>
                        <label style="font-size:0.65em;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;display:block;margin-bottom:2px;">Title</label>
                        <input id="confirm-title" type="text" value="${escapeMission(overrides.executiveTitle)}" style="width:100%;padding:6px 10px;background:#0b1017;border:1px solid rgba(255,255,255,0.08);border-radius:6px;color:#e2e8f0;font-size:0.85em;outline:none;box-sizing:border-box;">
                    </div>
                    <div>
                        <label style="font-size:0.65em;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;display:block;margin-bottom:2px;">Website</label>
                        <input id="confirm-website" type="url" value="${escapeMission(overrides.website)}" style="width:100%;padding:6px 10px;background:#0b1017;border:1px solid rgba(255,255,255,0.08);border-radius:6px;color:#e2e8f0;font-size:0.85em;outline:none;box-sizing:border-box;">
                    </div>
                </div>

                <div style="margin-bottom:12px;">
                    <div style="font-size:0.7em;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px;">Cadence Timeline — edit subjects & messages per step</div>
                    ${steps.length > 0 ? stepsHtml : `<div style="color:#64748b;font-size:0.9em;padding:12px;text-align:center;font-style:italic;">No cadence steps defined</div>`}
                </div>

                <div style="margin-top:20px;display:flex;gap:10px;justify-content:flex-end;padding-top:16px;border-top:1px solid rgba(255,255,255,0.06);">
                    <button class="mission-action-btn btn-deny" onclick="window.closeCadenceModal(); window.__enrichAction('${approvalId}')" style="padding:10px 24px;">← BACK TO ENRICH</button>
                    <button class="mission-action-btn btn-approve" id="confirm-approve-btn" onclick="window.confirmAndLaunchCadence('${approvalId}')" style="padding:10px 24px;font-weight:700;">✓ APPROVE & START CADENCE</button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    modal.addEventListener("click", (e) => {
        if (e.target === modal) closeCadenceModal();
    });
}

window.switchCadenceType = async function(approvalId) {
    if (!approvalId) return;
    const select = document.getElementById("cadence-type-select");
    if (!select) return;
    const type = select.value;
    const cdata = window._lastCadenceData || {};
    const overrides = cdata.overrides || {};
    const additionalContacts = cdata.additionalContacts || [];
    try {
        const previewR = await missionFetch(`/api/today-actions/preview-cadence/${approvalId}?type=${type}`);
        if (previewR.ok) {
            const previewData = await previewR.json();
            renderCadenceConfirmationModal(approvalId, overrides, additionalContacts, previewData.data || {});
        }
    } catch (_e) {}
};

window.confirmAndLaunchCadence = async function(approvalId) {
    if (!approvalId) return;
    const btn = document.getElementById("confirm-approve-btn");
    if (btn) { btn.disabled = true; btn.textContent = "APPROVING..."; }

    const cdata = window._lastCadenceData || {};
    const additionalContacts = cdata.additionalContacts || [];

    const overrides = {
        name: document.getElementById("confirm-name")?.value?.trim() || "",
        email: document.getElementById("confirm-email")?.value?.trim() || "",
        phone: document.getElementById("confirm-phone")?.value?.trim() || "",
        executiveName: document.getElementById("confirm-exec")?.value?.trim() || "",
        executiveTitle: document.getElementById("confirm-title")?.value?.trim() || "",
        website: document.getElementById("confirm-website")?.value?.trim() || ""
    };

    const cadenceTypeSelect = document.getElementById("cadence-type-select");
    const cadenceType = cadenceTypeSelect ? cadenceTypeSelect.value : "standard";
    const maxStep = cadenceType === "noemail" ? 3 : 5;

    const stepOverrides = [];
    for (let step = 1; step <= maxStep; step++) {
        const subjectEl = document.getElementById(`step-subject-${step}`);
        const messageEl = document.getElementById(`step-message-${step}`);
        const hasSubject = subjectEl && subjectEl.value?.trim();
        const hasMessage = messageEl && messageEl.value?.trim();
        if (hasSubject || hasMessage) {
            const entry = { step };
            if (hasSubject) entry.subject = subjectEl.value.trim();
            if (hasMessage) entry.message = messageEl.value.trim();
            stepOverrides.push(entry);
        }
    }

    const item = document.querySelector(`[data-approval-id="${approvalId}"]`);
    closeCadenceModal();
    if (item) item.style.opacity = "0.5";

    try {
        const r = await missionFetch(`/api/today-actions/approve/${approvalId}`, {
            method: "POST",
            body: JSON.stringify({
                confirmation: "APPROVE",
                approvedBy: "owner",
                prospectOverrides: overrides,
                additionalContacts,
                cadenceType,
                stepOverrides: stepOverrides.length > 0 ? stepOverrides : undefined
            })
        });
        const p = await r.json();
        if (!r.ok) throw new Error(p.error || "Approve failed");
        if (item) {
            const campaigns = Array.isArray(p.execution?.campaign) ? p.execution.campaign : (p.execution?.campaign ? [p.execution.campaign] : []);
            const activeCount = campaigns.filter(c => c?.created).length;
            const note = p.execution?.note || `${activeCount} cadence(s) started for ${escapeMission(overrides.name || "prospect")}`;
            item.innerHTML = `<div style="padding:14px;background:#0f2918;border-radius:8px;border:1px solid #22c55e;width:100%"><div style="font-weight:600;color:#22c55e;margin-bottom:4px">✅ Approved & Added to CRM</div><div style="font-size:0.85em;color:#a9f5d7">${escapeMission(note)}</div></div>`;
        }
    } catch (e) {
        if (item) item.style.opacity = "1";
        if (btn) { btn.disabled = false; btn.textContent = "✓ APPROVE & START CADENCE"; }
        alert("Approve failed: " + e.message);
        try {
            const previewR = await missionFetch(`/api/today-actions/preview-cadence/${approvalId}`);
            if (previewR.ok) {
                const previewData = await previewR.json();
                renderCadenceConfirmationModal(approvalId, overrides, additionalContacts, previewData.data || {});
            }
        } catch (_e) {}
    }
};

window.saveEdits = async function(approvalId) {
    if (!approvalId) return;
    const btn = document.getElementById("enrich-save-btn");
    if (btn) { btn.disabled = true; btn.textContent = "SAVING..."; }

    const additionalContacts = [];
    for (let i = 1; i <= 2; i++) {
        const emailEl = document.getElementById(`enrich-email-${i}`);
        if (!emailEl) continue;
        const email = emailEl.value?.trim() || "";
        if (!email) continue;
        additionalContacts.push({
            email,
            executiveName: document.getElementById(`enrich-name-${i}`)?.value?.trim() || ""
        });
    }

    const overrides = {
        name: document.getElementById("enrich-name")?.value?.trim() || "",
        email: document.getElementById("enrich-email")?.value?.trim() || "",
        phone: document.getElementById("enrich-phone")?.value?.trim() || "",
        executiveName: document.getElementById("enrich-exec")?.value?.trim() || "",
        executiveTitle: document.getElementById("enrich-title")?.value?.trim() || "",
        website: document.getElementById("enrich-website")?.value?.trim() || "",
        city: document.getElementById("enrich-city")?.value?.trim() || "",
        state: document.getElementById("enrich-state")?.value?.trim() || "OH",
        category: document.getElementById("enrich-category")?.value?.trim() || "",
        fitScore: Number(document.getElementById("enrich-fit")?.value) || 0,
        googleReviewCount: Number(document.getElementById("enrich-reviews")?.value) || 0
    };

    try {
        const r = await missionFetch(`/api/today-actions/save-edits/${approvalId}`, {
            method: "POST",
            body: JSON.stringify({ prospectOverrides: overrides, additionalContacts })
        });
        const p = await r.json();
        if (!r.ok) throw new Error(p.error || "Save failed");
        if (btn) {
            btn.textContent = "✓ SAVED";
            btn.style.borderColor = "#22c55e";
            btn.style.color = "#22c55e";
        }
        setTimeout(() => { if (btn) { btn.disabled = false; btn.textContent = "💾 SAVE EDITS"; btn.style.borderColor = ""; btn.style.color = ""; } }, 2000);
    } catch (e) {
        if (btn) { btn.disabled = false; btn.textContent = "💾 SAVE EDITS"; }
        alert("Save failed: " + e.message);
    }
};

window.addToCadence = async function(approvalId) {
    if (!approvalId) return;
    const item = document.querySelector(`[data-approval-id="${approvalId}"]`);
    const btn = document.getElementById("enrich-add-cadence-btn");
    if (btn) { btn.disabled = true; btn.textContent = "SAVING..."; }

    const additionalContacts = [];
    for (let i = 1; i <= 2; i++) {
        const emailEl = document.getElementById(`enrich-email-${i}`);
        if (!emailEl) continue;
        const email = emailEl.value?.trim() || "";
        if (!email) continue;
        additionalContacts.push({
            email,
            executiveName: document.getElementById(`enrich-name-${i}`)?.value?.trim() || ""
        });
    }

    const overrides = {
        name: document.getElementById("enrich-name")?.value?.trim() || "",
        email: document.getElementById("enrich-email")?.value?.trim() || "",
        phone: document.getElementById("enrich-phone")?.value?.trim() || "",
        executiveName: document.getElementById("enrich-exec")?.value?.trim() || "",
        executiveTitle: document.getElementById("enrich-title")?.value?.trim() || "",
        website: document.getElementById("enrich-website")?.value?.trim() || "",
        city: document.getElementById("enrich-city")?.value?.trim() || "",
        state: document.getElementById("enrich-state")?.value?.trim() || "OH",
        category: document.getElementById("enrich-category")?.value?.trim() || "",
        fitScore: Number(document.getElementById("enrich-fit")?.value) || 0,
        googleReviewCount: Number(document.getElementById("enrich-reviews")?.value) || 0
    };

    const hasEmail = !!(overrides.email?.trim());
    const cadenceType = hasEmail ? "standard" : "noemail";
    window._lastCadenceData = { approvalId, overrides, additionalContacts, cadenceType };

    if (btn) { btn.disabled = true; btn.textContent = "SAVING..."; }

    try {
        const saveR = await missionFetch(`/api/today-actions/save-edits/${approvalId}`, {
            method: "POST",
            body: JSON.stringify({ prospectOverrides: overrides, additionalContacts })
        });
        const saveP = await saveR.json();
        if (!saveR.ok) throw new Error(saveP.error || "Save failed");

        btn.textContent = "LOADING CADENCE...";

        const previewR = await missionFetch(`/api/today-actions/preview-cadence/${approvalId}?type=${cadenceType}`);
        if (!previewR.ok) {
            const e = await previewR.json().catch(() => ({}));
            throw new Error(e.error || "Failed to load cadence preview");
        }
        const previewData = await previewR.json();
        const data = previewData.data || {};

        const enrichModal = document.getElementById("enrich-modal-overlay");
        if (enrichModal) enrichModal.remove();
        if (btn) { btn.disabled = false; btn.textContent = "✓ ADD TO CADENCE"; }

        renderCadenceConfirmationModal(approvalId, overrides, additionalContacts, data);
    } catch (e) {
        if (item) item.style.opacity = "1";
        if (btn) { btn.disabled = false; btn.textContent = "✓ ADD TO CADENCE"; }
        alert("Failed to load cadence: " + e.message);
        const d = _lastEnrichData?.approvalId === approvalId ? _lastEnrichData.data : { enrichment: overrides };
        renderEnrichModal(approvalId, d);
    }
};

window.__resumeAction = async function(campaignId) {
    if (!campaignId) return;
    const item = document.querySelector(`[data-approval-id="campaign-pause-${campaignId}"]`);
    try {
        const r = await missionFetch(`/api/today-actions/resume/${campaignId}`, { method: "POST" });
        const p = await r.json();
        if (!r.ok) throw new Error(p.error || "Resume failed");
        if (item) item.innerHTML = `<div style="padding:14px;background:#0f2918;border-radius:8px;border:1px solid #22c55e;width:100%"><div style="font-weight:600;color:#22c55e;">Resumed</div></div>`;
    } catch (e) {
        alert("Resume failed: " + e.message);
    }
};

window.__closeAction = async function(campaignId) {
    if (!campaignId) return;
    if (!confirm("Close this campaign?")) return;
    const reason = prompt("Reason for closing:");
    if (reason === null) return;
    try {
        const r = await missionFetch(`/api/today-actions/close/${campaignId}`, {
            method: "POST",
            body: JSON.stringify({ reason })
        });
        const p = await r.json();
        if (!r.ok) throw new Error(p.error || "Close failed");
        const item = document.querySelector(`[data-approval-id="campaign-pause-${campaignId}"]`);
        if (item) item.innerHTML = `<div style="padding:14px;background:#291010;border-radius:8px;border:1px solid #ef4444;width:100%"><div style="font-weight:600;color:#ef4444;">Closed</div></div>`;
    } catch (e) {
        alert("Close failed: " + e.message);
    }
};

window.__launchAvo = async function(avoId) {
    if (!avoId) return;
    if (!confirm("Launch this AVO?")) return;
    try {
        const r = await missionFetch(`/api/today-actions/avo/${avoId}/launch`, { method: "POST", body: "{}" });
        const p = await r.json();
        if (!r.ok) throw new Error(p.error || "Launch failed");
        const item = document.querySelector(`[data-approval-id="avo-${avoId}"]`);
        if (item) item.innerHTML = `<div style="padding:14px;background:#0a2910;border-radius:8px;border:1px solid #22c55e;width:100%"><div style="font-weight:600;color:#22c55e;">Launched</div></div>`;
    } catch (e) {
        alert("Launch failed: " + e.message);
    }
};

window.__closeAvo = async function(avoId) {
    if (!avoId) return;
    if (!confirm("Close this AVO?")) return;
    const reason = prompt("Reason for closing:");
    if (reason === null) return;
    try {
        const r = await missionFetch(`/api/today-actions/avo/${avoId}/close`, {
            method: "POST", body: JSON.stringify({ reason })
        });
        const p = await r.json();
        if (!r.ok) throw new Error(p.error || "Close failed");
        const item = document.querySelector(`[data-approval-id="avo-${avoId}"]`);
        if (item) item.innerHTML = `<div style="padding:14px;background:#291010;border-radius:8px;border:1px solid #ef4444;width:100%"><div style="font-weight:600;color:#ef4444;">Closed</div></div>`;
    } catch (e) {
        alert("Close failed: " + e.message);
    }
};

window.__resolveAction = async function(escalationId) {
    if (!escalationId) return;
    const resolution = prompt("Resolution notes (optional):");
    if (resolution === null) return;
    try {
        const r = await missionFetch(`/api/today-actions/resolve/${escalationId}`, {
            method: "POST",
            body: JSON.stringify({ resolution: resolution || "Resolved via Daily Mission" })
        });
        const p = await r.json();
        if (!r.ok) throw new Error(p.error || "Resolve failed");
        const item = document.querySelector(`[data-approval-id="escalation-${escalationId}"]`);
        if (item) item.innerHTML = `<div style="padding:14px;background:#0f2918;border-radius:8px;border:1px solid #22c55e;width:100%"><div style="font-weight:600;color:#22c55e;">Resolved</div></div>`;
    } catch (e) {
        alert("Resolve failed: " + e.message);
    }
};

window.__acceptVentureCandidate = async function(candidateId) {
    if (!candidateId) return;
    if (!confirm("Accept this AVO opportunity?")) return;
    try {
        const r = await missionFetch(`/api/venture-agent/candidates/${candidateId}/decision`, {
            method: "POST",
            body: JSON.stringify({ decision: "accepted", confirmation: "ACCEPT OPPORTUNITY" })
        });
        const p = await r.json();
        if (!r.ok) throw new Error(p.error || "Accept failed");
        const item = document.querySelector(`[data-approval-id="${candidateId}"]`);
        if (item) item.innerHTML = `<div style="padding:14px;background:#0f2918;border-radius:8px;border:1px solid #22c55e;width:100%"><div style="font-weight:600;color:#22c55e;">Accepted</div></div>`;
    } catch (e) {
        alert("Accept failed: " + e.message);
    }
};

window.__deferVentureCandidate = async function(candidateId) {
    if (!candidateId) return;
    const reason = prompt("Defer reason (optional):");
    if (reason === null) return;
    try {
        const r = await missionFetch(`/api/venture-agent/candidates/${candidateId}/decision`, {
            method: "POST",
            body: JSON.stringify({ decision: "deferred", confirmation: "DEFER", reason: reason || "" })
        });
        const p = await r.json();
        if (!r.ok) throw new Error(p.error || "Defer failed");
        const item = document.querySelector(`[data-approval-id="${candidateId}"]`);
        if (item) item.innerHTML = `<div style="padding:14px;background:#3a2e12;border-radius:8px;border:1px solid #f59e0b;width:100%"><div style="font-weight:600;color:#f59e0b;">Deferred</div></div>`;
    } catch (e) {
        alert("Defer failed: " + e.message);
    }
};

window.__rejectVentureCandidate = async function(candidateId) {
    if (!candidateId) return;
    const reason = prompt("Reason for rejecting:");
    if (reason === null) return;
    try {
        const r = await missionFetch(`/api/venture-agent/candidates/${candidateId}/decision`, {
            method: "POST",
            body: JSON.stringify({ decision: "rejected", confirmation: "REJECT OPPORTUNITY", reason: reason || "" })
        });
        const p = await r.json();
        if (!r.ok) throw new Error(p.error || "Reject failed");
        const item = document.querySelector(`[data-approval-id="${candidateId}"]`);
        if (item) item.innerHTML = `<div style="padding:14px;background:#291010;border-radius:8px;border:1px solid #ef4444;width:100%"><div style="font-weight:600;color:#ef4444;">Rejected</div></div>`;
    } catch (e) {
        alert("Reject failed: " + e.message);
    }
};

window.__batchApprove = async function(ids) {
    const idList = ids.split(",").filter(Boolean);
    if (!idList.length) return;
    if (!confirm(`Approve all ${idList.length} items?`)) return;
    let ok = 0, fail = 0;
    for (const id of idList) {
        try {
            const r = await missionFetch(`/api/today-actions/approve/${id}`, {
                method: "POST",
                body: JSON.stringify({ confirmation: "APPROVE", approvedBy: "owner" })
            });
            if (r.ok) ok++; else fail++;
        } catch (e) { fail++; }
    }
    alert(`${ok} approved, ${fail} failed.`);
    loadMission();
};

window.__batchDeny = async function(ids) {
    const idList = ids.split(",").filter(Boolean);
    if (!idList.length) return;
    const reason = prompt("Reason for denying (optional):");
    if (reason === null) return;
    if (!confirm(`Deny all ${idList.length} items?`)) return;
    let ok = 0, fail = 0;
    for (const id of idList) {
        try {
            const r = await missionFetch(`/api/today-actions/deny/${id}`, {
                method: "POST",
                body: JSON.stringify({ confirmation: "DENY", reason, deniedBy: "owner" })
            });
            if (r.ok) ok++; else fail++;
        } catch (e) { fail++; }
    }
    alert(`${ok} denied, ${fail} failed.`);
    loadMission();
};

window.loadMission = loadMission;
