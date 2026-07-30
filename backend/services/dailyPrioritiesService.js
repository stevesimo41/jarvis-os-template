const fs = require("fs");
const path = require("path");
const canonicalExecutive = require("./canonicalExecutiveService");
const goalEngine = require("./goalEngine");
const agentScheduler = require("../agents/agentSchedulerService");
const ventureRevenue = require("../agents/avoRevenueAgentService");
const opportunityPilot = require("../agents/opportunityPilotService");
const xodusAgent = require("../agents/xodusMissionAgentService");
const jarvisOpps = require("../agents/jarvisOpportunitiesService");
const approvalService = require("../governance/approvalService");

const DATA_DIR = path.join(__dirname, "..", "data", "agents");
const STATE_FILE = path.join(DATA_DIR, "daily-priorities.json");

const DEVOTIONALS = [
    { verse: "Trust in the Lord with all your heart, and do not lean on your own understanding. In all your ways acknowledge him, and he will make straight your paths.", reference: "Proverbs 3:5-6 (ESV)", reflection: "Today, before diving into the work, pause and acknowledge His direction. Let faith lead the way." },
    { verse: "Be still, and know that I am God.", reference: "Psalm 46:10 (ESV)", reflection: "In the busyness of building, stillness is not laziness—it is alignment. Take a moment to be present with God before the day begins." },
    { verse: "For I know the plans I have for you, declares the Lord, plans for welfare and not for evil, to give you a future and a hope.", reference: "Jeremiah 29:11 (ESV)", reflection: "The work you do today is part of a larger story. Trust that the vision is being revealed in His timing." },
    { verse: "Whatever you do, work heartily, as for the Lord and not for men.", reference: "Colossians 3:23 (ESV)", reflection: "Every line of code, every conversation, every decision—do it as unto Him. Excellence is an act of worship." },
    { verse: "The fear of the Lord is the beginning of wisdom, and the knowledge of the Holy One is insight.", reference: "Proverbs 9:10 (ESV)", reflection: "Wisdom isn't just intelligence—it's alignment with God's perspective. Seek His insight before your own." },
    { verse: "Commit your work to the Lord, and your plans will be established.", reference: "Proverbs 16:3 (ESV)", reflection: "The work you're building matters. Commit it today—not just in word, but in how you prioritize and execute." },
    { verse: "And we know that for those who love God all things work together for good, for those who are called according to his purpose.", reference: "Romans 8:28 (ESV)", reflection: "Even the setbacks and delays are part of the design. Trust the process He is orchestrating." },
    { verse: "But seek first the kingdom of God and his righteousness, and all these things will be added to you.", reference: "Matthew 6:33 (ESV)", reflection: "Before the ventures, the agents, the revenue—seek His kingdom. Everything else flows from that alignment." },
    { verse: "Iron sharpens iron, and one man sharpens another.", reference: "Proverbs 27:17 (ESV)", reflection: "Who are you sharpening today? Who is sharpening you? Community is not optional—it's essential." },
    { verse: "The Lord is my shepherd; I shall not want. He makes me lie down in green pastures. He leads me beside still waters. He restores my soul.", reference: "Psalm 23:1-3 (ESV)", reflection: "Rest is not a reward—it's a prerequisite. Let Him restore your soul before you pour out for others." },
    { verse: "For God gave us a spirit not of fear but of power and love and self-control.", reference: "2 Timothy 1:7 (ESV)", reflection: "Fear is not from God. Move forward in power, love, and a sound mind today." },
    { verse: "The beginning of wisdom is this: Get wisdom, and whatever you get, get insight.", reference: "Proverbs 4:7 (ESV)", reflection: "Insight is more valuable than information. Seek to understand, not just to know." },
    { verse: "Come to me, all who labor and are heavy laden, and I will give you rest.", reference: "Matthew 11:28 (ESV)", reflection: "The weight you carry was never meant to be carried alone. Lay it down, even briefly, and receive His rest." },
    { verse: "He who began a good work in you will bring it to completion at the day of Jesus Christ.", reference: "Philippians 1:6 (ESV)", reflection: "The work He started in you—in your family, in your ventures—is being completed. Trust His faithfulness." },
    { verse: "Let us not grow weary of doing good, for in due season we will reap, if we do not give up.", reference: "Galatians 6:9 (ESV)", reflection: "The harvest is coming. Stay faithful in the small things. Every seed counts." },
    { verse: "Above all, keep loving one another earnestly, since love covers a multitude of sins.", reference: "1 Peter 4:8 (ESV)", reflection: "Love is the foundation. Before strategy, before revenue, before growth—love well." },
    { verse: "The heart of man plans his way, but the Lord establishes his steps.", reference: "Proverbs 16:9 (ESV)", reflection: "Plan boldly, but hold loosely. His steps are more important than your plans." },
    { verse: "Do not be anxious about anything, but in everything by prayer and supplication with thanksgiving let your requests be made known to God.", reference: "Philippians 4:6 (ESV)", reflection: "Anxiety is a signal to pray, not to worry. Bring everything to Him today." },
    { verse: "Hear, O Israel: The Lord our God, the Lord is one. You shall love the Lord your God with all your heart and with all your soul and with all your might.", reference: "Deuteronomy 6:4-5 (ESV)", reflection: "Wholeness comes from loving God with everything. Not just part—everything." },
    { verse: "And let us consider how to stir up one another to love and good works, not neglecting to meet together.", reference: "Hebrews 10:24-25 (ESV)", reflection: "Isolation is the enemy of growth. Who can you encourage today?" },
    { verse: "The fear of the Lord is a fountain of life, that one may turn away from the snares of death.", reference: "Proverbs 14:27 (ESV)", reflection: "Reverence for God is not fear—it is the source of true life and freedom." },
    { verse: "But the fruit of the Spirit is love, joy, peace, patience, kindness, goodness, faithfulness, gentleness, self-control.", reference: "Galatians 5:22-23 (ESV)", reflection: "Which fruit needs to grow in you today? Ask the Spirit to cultivate it." },
    { verse: "For where your treasure is, there your heart will be also.", reference: "Matthew 6:21 (ESV)", reflection: "What you prioritize today reveals what you truly treasure. Is it aligned with eternity?" },
    { verse: "The Lord is near to the brokenhearted and saves the crushed in spirit.", reference: "Psalm 34:18 (ESV)", reflection: "If you or someone you know is hurting, He is near. He specializes in restoration." },
    { verse: "We love because he first loved us.", reference: "1 John 4:19 (ESV)", reflection: "Love flows from being loved. Receive His love first, then pour it out." },
    { verse: "And my God will supply every need of yours according to his riches in glory in Christ Jesus.", reference: "Philippians 4:19 (ESV)", reflection: "Every need—financial, emotional, spiritual—He supplies. Trust His provision today." },
    { verse: "No temptation has overtaken you that is not common to man. God is faithful, and he will not let you be tempted beyond your ability.", reference: "1 Corinthians 10:13 (ESV)", reflection: "Whatever challenge comes today, He has already provided a way through. You are not alone." },
    { verse: "But they who wait for the Lord shall renew their strength; they shall mount up with wings like eagles.", reference: "Isaiah 40:31 (ESV)", reflection: "Waiting is not passive—it is active trust. His timing produces His strength." },
    { verse: "The Lord bless you and keep you; the Lord make his face to shine upon you and be gracious to you.", reference: "Numbers 6:24-25 (ESV)", reflection: "This is God's blessing over you today. Receive it. Carry it into everything you do." },
    { verse: "Beloved, let us love one another, for love is from God, and whoever loves has been born of God and knows God.", reference: "1 John 4:7 (ESV)", reflection: "Love is the evidence of knowing God. Let love be your highest pursuit today." }
];

function loadState() {
    try {
        if (fs.existsSync(STATE_FILE)) {
            return JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
        }
    } catch (e) {
        console.error("Failed to load daily priorities state:", e.message);
    }
    return {
        history: [],
        userPreferences: {
            categoryWeights: {},
            priorityOverrides: [],
            approvalRate: 0,
            totalApprovals: 0
        }
    };
}

function saveState(state) {
    try {
        if (!fs.existsSync(DATA_DIR)) {
            fs.mkdirSync(DATA_DIR, { recursive: true });
        }
        fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
    } catch (e) {
        console.error("Failed to save daily priorities state:", e.message);
    }
}

function getTodaysDevotional() {
    const today = new Date();
    const start = new Date(today.getFullYear(), 0, 0);
    const dayOfYear = Math.floor((today - start) / 86400000);
    return DEVOTIONALS[dayOfYear % DEVOTIONALS.length];
}

function getAgentHighlights() {
    const highlights = [];

    try {
        const schedules = agentScheduler.getSchedules();
        const activeSchedules = schedules.filter(s => s.enabled);
        const recentRuns = agentScheduler.getRecentRuns(10);

        if (recentRuns.length > 0) {
            const latestRun = recentRuns[0];
            highlights.push({
                category: "agent",
                title: `Agent Activity: ${latestRun.agentId}`,
                detail: `Last run: ${new Date(latestRun.runAt).toLocaleTimeString()} — ${latestRun.outcome}`,
                agentId: latestRun.agentId
            });
        }

        const dueCampaigns = [];
        try {
            const campaignSvc = require("./wellNoticedCampaignService");
            dueCampaigns.push(...campaignSvc.getCampaignsDue());
        } catch (_e) { /* campaign service may not exist yet */ }

        if (dueCampaigns.length > 0) {
            highlights.push({
                category: "campaign",
                title: `${dueCampaigns.length} campaign(s) need attention`,
                detail: `Well Noticed campaigns with pending steps ready to execute.`
            });
        }
    } catch (e) {
        console.warn("Failed to get agent highlights:", e.message);
    }

    return highlights;
}

function getOpportunityHighlights() {
    const highlights = [];

    try {
        const oppsState = opportunityPilot.status();
        if (oppsState.preview && oppsState.preview.length > 0) {
            const topOpp = oppsState.preview[0];
            highlights.push({
                category: "opportunity",
                title: `Top Opportunity: ${topOpp.title}`,
                detail: `${topOpp.confidence}% confidence — ${topOpp.evidence || "No evidence details"}`,
                ventureId: topOpp.ventureId
            });
        }
    } catch (_e) { /* opportunity pilot may not have data */ }

    try {
        const joState = jarvisOpps.status();
        if (joState.candidates && joState.candidates.length > 0) {
            highlights.push({
                category: "revenue",
                title: `${joState.candidates.length} revenue candidate(s) discovered`,
                detail: "Jarvis Opportunities agent has identified potential revenue sources."
            });
        }
    } catch (_e) { /* jarvis opps may not have data */ }

    return highlights;
}

function getVentureHighlights() {
    const highlights = [];

    try {
        const goals = goalEngine.prioritizeGoals();
        if (goals.length > 0) {
            const topGoal = goals[0];
            highlights.push({
                category: "goal",
                title: `Primary Goal: ${topGoal.name}`,
                detail: `Progress: ${topGoal.progress}% — Next: ${topGoal.nextMilestone}`,
                score: topGoal.executiveScore
            });
        }

        if (goals.length > 1) {
            const secondGoal = goals[1];
            highlights.push({
                category: "goal",
                title: `Secondary Goal: ${secondGoal.name}`,
                detail: `Progress: ${secondGoal.progress}% — Next: ${secondGoal.nextMilestone}`,
                score: secondGoal.executiveScore
            });
        }
    } catch (_e) { /* goal engine may fail */ }

    return highlights;
}

function getGovernanceHighlights() {
    const highlights = [];

    try {
        const approvals = approvalService.listApprovals();
        const pending = approvals.filter(a => a.status === "pending");
        if (pending.length > 0) {
            highlights.push({
                category: "governance",
                title: `${pending.length} approval(s) pending`,
                detail: "Items in the governance queue awaiting your decision."
            });
        }
    } catch (_e) { /* approvals may not exist */ }

    return highlights;
}

function getStrategicIntelHighlights() {
    const highlights = [];

    try {
        const intelService = require("./strategicIntelligenceService");
        const intel = intelService.getLatestInsights();
        if (intel.insights && intel.insights.length > 0) {
            const topInsight = intel.insights[0];
            highlights.push({
                category: "intel",
                title: `Top Insight: ${topInsight.title}`,
                detail: `From ${topInsight.source} — Score: ${topInsight.score}`,
                url: topInsight.url
            });

            const ventureBreakdown = {};
            intel.insights.forEach(i => {
                const v = i.venture || "general";
                ventureBreakdown[v] = (ventureBreakdown[v] || 0) + 1;
            });
            const breakdownStr = Object.entries(ventureBreakdown)
                .map(([k, v]) => `${k}: ${v}`)
                .join(", ");
            highlights.push({
                category: "intel",
                title: `${intel.total} insights from latest scan`,
                detail: `Breakdown: ${breakdownStr}`
            });
        }
    } catch (_e) { /* intel service may not exist */ }

    return highlights;
}

function generateDailyPriorities() {
    const state = loadState();
    const devotional = getTodaysDevotional();

    const allHighlights = [
        ...getAgentHighlights(),
        ...getOpportunityHighlights(),
        ...getVentureHighlights(),
        ...getGovernanceHighlights(),
        ...getStrategicIntelHighlights()
    ];

    const categoryScores = {};
    allHighlights.forEach(h => {
        categoryScores[h.category] = (categoryScores[h.category] || 0) + 1;
    });

    const priorities = [];

    priorities.push({
        rank: 1,
        category: "faith",
        title: "Faith & Family",
        detail: devotional.reflection,
        verse: devotional.verse,
        reference: devotional.reference,
        source: "devotional",
        confidence: 100,
        adjustable: true
    });

    const jarvisHighlights = allHighlights.filter(h =>
        h.category === "agent" || h.category === "intel"
    );
    if (jarvisHighlights.length > 0) {
        const best = jarvisHighlights[0];
        priorities.push({
            rank: 2,
            category: "jarvis",
            title: best.title,
            detail: best.detail,
            source: "system",
            confidence: 85,
            adjustable: true
        });
    } else {
        priorities.push({
            rank: 2,
            category: "jarvis",
            title: "JARVIS Development — Build My Brain",
            detail: "Continue building core system: agent communication, mobile-first UI, voice interaction. JARVIS learns and adapts to your workflows.",
            source: "default",
            confidence: 70,
            adjustable: true
        });
    }

    const ventureHighlights = allHighlights.filter(h =>
        h.category === "goal" || h.category === "revenue"
    );
    if (ventureHighlights.length > 0) {
        const best = ventureHighlights[0];
        priorities.push({
            rank: 3,
            category: "venture",
            title: best.title,
            detail: best.detail,
            source: "system",
            confidence: 80,
            adjustable: true
        });
    } else {
        priorities.push({
            rank: 3,
            category: "venture",
            title: "Venture Agent — Prospect & Close Revenue",
            detail: "Prospect → Qualify → Add to CRM with approval → Outreach campaigns → Close revenue. Learns from your decision patterns.",
            source: "default",
            confidence: 60,
            adjustable: true
        });
    }

    const oppHighlights = allHighlights.filter(h =>
        h.category === "opportunity" || h.category === "campaign"
    );
    if (oppHighlights.length > 0) {
        const best = oppHighlights[0];
        priorities.push({
            rank: 4,
            category: "execution",
            title: best.title,
            detail: best.detail,
            source: "system",
            confidence: 75,
            adjustable: true
        });
    } else {
        priorities.push({
            rank: 4,
            category: "execution",
            title: "Agent Cross-Communication",
            detail: "Ensure agents share context and help each other improve. Content informs outreach, research informs all, venture informs campaigns.",
            source: "default",
            confidence: 60,
            adjustable: true
        });
    }

    const govHighlights = allHighlights.filter(h =>
        h.category === "governance"
    );
    if (govHighlights.length > 0) {
        const best = govHighlights[0];
        priorities.push({
            rank: 5,
            category: "governance",
            title: best.title,
            detail: best.detail,
            source: "system",
            confidence: 90,
            adjustable: true
        });
    } else {
        priorities.push({
            rank: 5,
            category: "governance",
            title: "System Oversight",
            detail: "Review agent statuses, approvals, and system health.",
            source: "default",
            confidence: 50,
            adjustable: true
        });
    }

    const today = new Date().toISOString().split("T")[0];

    return {
        date: today,
        priorities,
        devotional,
        generatedAt: new Date().toISOString(),
        highlightsUsed: allHighlights.length,
        state: loadState()
    };
}

function recordApproval(date, priorities, userOrder, adjustments) {
    const state = loadState();

    const record = {
        date,
        submittedAt: new Date().toISOString(),
        originalPriorities: priorities.map(p => ({ rank: p.rank, title: p.title, category: p.category })),
        userOrder: userOrder.map((p, i) => ({ rank: i + 1, title: p.title, category: p.category })),
        adjustments: adjustments || []
    };

    state.history.push(record);
    state.history = state.history.slice(-90);

    userOrder.forEach((p, i) => {
        const originalRank = priorities.find(orig => orig.title === p.title)?.rank;
        if (originalRank !== undefined) {
            const delta = originalRank - (i + 1);
            const key = p.category;
            if (!state.userPreferences.categoryWeights[key]) {
                state.userPreferences.categoryWeights[key] = { totalDelta: 0, count: 0 };
            }
            state.userPreferences.categoryWeights[key].totalDelta += delta;
            state.userPreferences.categoryWeights[key].count += 1;
        }
    });

    state.userPreferences.totalApprovals = (state.userPreferences.totalApprovals || 0) + 1;
    state.userPreferences.approvalRate = state.history.length;

    saveState(state);
    return record;
}

function getUserPreferences() {
    const state = loadState();
    const prefs = state.userPreferences;

    const categoryRankings = {};
    for (const [cat, data] of Object.entries(prefs.categoryWeights || {})) {
        if (data.count > 0) {
            categoryRankings[cat] = data.totalDelta / data.count;
        }
    }

    return {
        totalApprovals: prefs.totalApprovals || 0,
        categoryRankings,
        recentHistory: state.history.slice(-7)
    };
}

module.exports = {
    generateDailyPriorities,
    recordApproval,
    getUserPreferences,
    getTodaysDevotional,
    DEVOTIONALS
};
