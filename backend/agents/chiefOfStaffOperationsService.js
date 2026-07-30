const crypto = require("crypto");
const path = require("path");
const executive = require("../services/canonicalExecutiveService");
const approvals = require("../governance/approvalService");
const control = require("../services/systemControlService");
const readiness = require("../readiness/readinessService");
const activity = require("../brain/activityService");
const escalations = require("../services/agentEscalationService");
const communication = require("../services/agentCommunicationService");
const { readJson, writeJsonAtomic } = require("../storage/atomicJsonStore");
const llm = require("../services/llm/index");
const learningEngine = require("../services/learningEngine");
const competitiveIntel = require("../services/competitiveIntelService");
const runTracker = require("../services/runTracker");

const agent = {
    id: "chief-of-staff",
    name: "Chief of Staff",
    version: "3.0",
    mode: "operational-oversight",
    role: "Coordinate priorities, risks, approvals, and agent handoffs without duplicating specialist execution.",
    prohibitedActions: ["override_owner", "override_agent_policy", "external_outreach", "publish", "spend", "purchase", "contract", "transact", "access_financial_accounts"]
};

function ledgerPath() { return process.env.JARVIS_CHIEF_OF_STAFF_RUNS_PATH || path.join(__dirname, "../data/agents/chief-of-staff-runs.json"); }
function runs() { return readJson(ledgerPath(), []).slice().reverse(); }

function discoverAgents() {
    const fs = require("fs");
    const agentsDir = __dirname;
    try {
        const files = fs.readdirSync(agentsDir).filter(f => f.endsWith(".js") && f !== "chiefOfStaffOperationsService.js" && f !== "agentSchedulerService.js");
        return files.map(f => {
            const name = f.replace(/\.js$/, "");
            const display = name.replace(/([A-Z])/g, " $1").replace(/^./, s => s.toUpperCase()).replace(/Service$/, "").trim();
            return { id: name, file: f, name: display };
        });
    } catch { return []; }
}

async function snapshot() {
    let executiveState = { primaryGoal: { name: "Unavailable", priority: 0, nextMilestone: "" }, tasks: { pending: 0 }, opportunities: { qualified: 0 }, ventures: [], goals: [] };
    let pendingApprovals = [];
    let readinessState = { criticalBlockers: [] };
    let globalStop = { stopped: false };
    let activeEscalations = [];
    let escalationStatus = { active: 0, resolved: 0 };
    let learningData = { insights: null, stats: null, adjustments: null, corrections: [] };
    let competitiveData = { landscape: null, totalCompetitors: 0, topCompetitors: [] };
    let runHealth = {};
    let recentActivity = [];
    let functionalGaps = [];

    try { executiveState = executive.state(); } catch (_e) { console.warn("[CoS] executive.state failed:", _e.message); }
    try { pendingApprovals = approvals.listApprovals().filter(item => item.status === "pending"); } catch (_e) { console.warn("[CoS] approvals.listApprovals failed:", _e.message); }
    try { readinessState = readiness.assessment(); } catch (_e) { console.warn("[CoS] readiness.assessment failed:", _e.message); }
    try { globalStop = control.status(); } catch (_e) { console.warn("[CoS] control.status failed:", _e.message); }
    try { activeEscalations = escalations.active(); } catch (_e) { console.warn("[CoS] escalations.active failed:", _e.message); }
    try { escalationStatus = escalations.status(); } catch (_e) { console.warn("[CoS] escalations.status failed:", _e.message); }
    try { learningData.insights = learningEngine.getInsights(); learningData.stats = learningEngine.getStats(); learningData.adjustments = learningEngine.getAdjustments(); } catch (_e) { console.warn("[CoS] learningEngine failed:", _e.message); }
    try { const ci = competitiveIntel.getLandscape(); competitiveData.landscape = ci; competitiveData.totalCompetitors = ci.totalCompetitors || 0; competitiveData.topCompetitors = ci.topCompetitors || []; } catch (_e) { console.warn("[CoS] competitiveIntel failed:", _e.message); }
    try { runHealth = runTracker.getAgentHealth(); } catch (_e) { console.warn("[CoS] runTracker failed:", _e.message); }
    try { recentActivity = activity.list(20); } catch (_e) { console.warn("[CoS] activity.list failed:", _e.message); }

    const staticRoster = [
        { id: "market-pulse-agent", name: "Market Pulse Agent", responsibility: "Monitor RSS feeds and news for opportunities" },
        { id: "market-discovery-agent", name: "Market Discovery Agent", responsibility: "Discover new market opportunities" },
        { id: "opportunity-pilot-agent", name: "Opportunity Pilot Agent", responsibility: "Research and qualify opportunities" },
        { id: "research-agent", name: "Research Agent", responsibility: "Web research and data gathering" },
        { id: "prospect-qualification-agent", name: "Prospect Qualification Agent", responsibility: "Qualify and score prospects" },
        { id: "strategic-intelligence-agent", name: "Strategic Intelligence Agent", responsibility: "Market and competitive intelligence" },
        { id: "production-agent", name: "Production Agent", responsibility: "Task execution and delivery" }
    ];

    const roster = staticRoster.map(a => {
        const agentRun = runHealth[a.id];
        const statusVal = agentRun?.lastStatus || "idle";
        const blocker = agentRun?.lastError || null;
        return {
            ...a,
            status: blocker ? "blocked" : statusVal === "operational" ? "operational-supervised" : statusVal === "active" ? "operational" : "idle",
            work: agentRun ? `${agentRun.runs || 0} runs` : "Awaiting first run",
            blocker
        };
    });

    const escalationAlerts = activeEscalations.map(e => ({
        severity: e.severity === "critical" ? "critical" : e.severity === "warning" ? "decision" : "strategy",
        title: `[${e.agentId}] ${e.type}: ${e.message}`,
        ownerAction: e.type === "clarification-needed" ? "Provide clarification" : e.type === "stuck" ? "Investigate" : "Review and resolve"
    }));

    const alerts = [
        ...(globalStop.stopped ? [{ severity: "critical", title: "Global emergency stop is active", ownerAction: "Review and explicitly resume governed operations" }] : []),
        ...pendingApprovals.map(item => ({ severity: "decision", title: `Approval pending: ${item.action}`, ownerAction: "Review scope, evidence, and expiration" })),
        ...readinessState.criticalBlockers.map(item => ({ severity: "readiness", title: `Production blocker: ${item}`, ownerAction: "Complete the associated readiness control" })),
        ...escalationAlerts
    ];
    const liStats = learningData.stats || {};

    try {
      const gaps = [];
      const readinessDetail = readiness.assessment();
      for (const gate of (readinessDetail.gates || [])) {
        if (!gate.ready && gate.critical) gaps.push({ severity: "critical", area: gate.id, detail: gate.detail });
      }
      if (!llm.status().configured) gaps.push({ severity: "warning", area: "llm", detail: "No LLM provider configured — LLM-dependent features disabled" });
      const adj = learningData.adjustments || {};
      const extraction = adj.extraction || {};
      if ((extraction.blockedNames || []).length > 0) {
        gaps.push({ severity: "info", area: "extraction", detail: `${extraction.blockedNames.length} name patterns blocked from re-extraction` });
      }
      const ciCount = competitiveData.totalCompetitors || 0;
      if (ciCount > 0) gaps.push({ severity: "info", area: "competitive", detail: `${ciCount} competitors tracked` });
      if (liStats.decisions === 0 && liStats.outcomes === 0 && liStats.corrections === 0) {
        gaps.push({ severity: "info", area: "learning", detail: "Learning engine has no data yet" });
      }
      if (pendingApprovals.length > 0) gaps.push({ severity: "decision", area: "approvals", detail: `${pendingApprovals.length} pending approvals` });
      const blocked = roster.filter(r => r.status.includes("blocked"));
      for (const r of blocked) {
        gaps.push({ severity: "warning", area: r.id, detail: `${r.name} blocked: ${r.blocker}` });
      }
      functionalGaps = gaps;
    } catch (_e) { console.warn("[CoS] functional gaps failed:", _e.message); }

    return {
        generatedAt: new Date().toISOString(), agent,
        executive: { primaryGoal: executiveState.primaryGoal, pendingTasks: executiveState.tasks.pending, qualifiedOpportunities: executiveState.opportunities.qualified },
        roster, alerts,
        priorities: [
            { rank: 1, owner: "You", action: "Configure your LLM provider in .env", reason: "Enables AI-powered features across all agents" },
            { rank: 2, owner: "Discovery Agent", action: "Complete initial system scan to tailor JARVIS to your environment", reason: "Auto-detects your tools, OS, and business context" },
            { rank: 3, owner: "You", action: "Review pending approvals and configure your first venture", reason: "Start building your opportunity pipeline" },
            { rank: 4, owner: "Market Pulse Agent", action: "Begin monitoring your industry RSS feeds", reason: "Surface relevant opportunities automatically" }
        ],
        handoffs: roster.map(item => ({ from: "chief-of-staff", to: item.id, type: "oversight-only", status: item.status, instruction: item.blocker || "Continue supervised preparation within current policy" })),
        metrics: {
            agentsOverseen: roster.length,
            operationalAgents: roster.filter(item => item.status.startsWith("operational")).length,
            pausedAgents: roster.filter(item => item.status.includes("paused")).length,
            blockedAgents: roster.filter(item => item.status.includes("blocked")).length,
            pendingApprovals: pendingApprovals.length,
            alerts: alerts.length,
            escalations: escalationStatus,
            communication: communication.status()
        },
        boundaries: { specialistExecutionOwnedBySpecialists: true, ownerAuthority: "absolute", approvalBypass: false, policyBypass: false, backgroundExecution: false, externalActions: false, financialAccountAccess: false, maximumBudget: 0 },
        learning: {
            decisions: liStats.decisions || 0,
            outcomes: liStats.outcomes || 0,
            corrections: liStats.corrections || 0,
            extractionRules: liStats.extractionRules || 0,
            approvalRate: liStats.patterns?.approvalRate || 0,
            positiveRate: liStats.outcomePatterns?.positiveRate || 0,
            summary: learningData.insights?.summary || [],
            adjustments: learningData.adjustments,
            recentCorrections: (learningData.adjustments?.corrections || []).slice(0, 5)
        },
        competitive: {
            totalCompetitors: competitiveData.totalCompetitors,
            topCompetitors: competitiveData.topCompetitors.slice(0, 8),
            significantSightings: (competitiveData.landscape?.recentSightings || []).slice(0, 5)
        },
        agentHealth: runHealth,
        recentActivity: recentActivity.slice(0, 10).map(a => ({
            phase: a.phase || a.type, summary: a.summary || a.description, timestamp: a.timestamp
        })),
        functionalGaps,
        pendingApprovalDetails: pendingApprovals.slice(0, 10).map(a => ({
            action: a.action, title: a.title, context: a.context,
            createdAt: a.createdAt || a.timestamp, approvalId: a.approvalId || a.id
        }))
    };
}

async function reasonAboutState(snapshotData) {
    const llmStatus = llm.status();
    if (!llmStatus.configured) return null;

    const systemPrompt = llm.buildJarvisSystemPrompt("chief-of-staff", null);
    const agentSummary = snapshotData.roster.map(a =>
        `- ${a.name} (${a.status}): ${a.work}${a.blocker ? ` [BLOCKED: ${a.blocker}]` : ""}`
    ).join("\n");

    const alertSummary = snapshotData.alerts.map(a =>
        `- [${a.severity}] ${a.title}: ${a.ownerAction}`
    ).join("\n");

    const gaps = snapshotData.functionalGaps || [];
    const gapSummary = gaps.map(g => `- [${g.severity}] ${g.area}: ${g.detail}`).join("\n");

    const userMessage = [
        `You are the Chief of Staff reviewing JARVIS OS agent operations.`,
        ``,
        `**Executive Context:**`,
        `- Primary Goal: ${snapshotData.executive.primaryGoal || "Not set"}`,
        `- Pending Tasks: ${snapshotData.executive.pendingTasks || 0}`,
        `- Qualified Opportunities: ${snapshotData.executive.qualifiedOpportunities || 0}`,
        ``,
        `**Agent Roster:**`,
        agentSummary || "No agents registered.",
        ``,
        `**Active Alerts:**`,
        alertSummary || "No alerts.",
        ``,
        `**Functional Gaps / Things to Fix:**`,
        gapSummary || "None identified.",
        ``,
        `**Learning Engine:**`,
        `- ${snapshotData.learning.decisions || 0} decisions, ${snapshotData.learning.outcomes || 0} outcomes`,
        `- Approval rate: ${Math.round((snapshotData.learning.approvalRate || 0) * 100)}%`,
        ``,
        `**Pending Approvals:** ${snapshotData.metrics.pendingApprovals}`,
        ``,
        `Provide a concise operational briefing (5-8 sentences):`,
        `1. What is the most important thing to focus on right now?`,
        `2. Which agent needs attention and why?`,
        `3. What is the biggest blocker to progress?`,
        `4. What is your top recommendation for the next action?`,
        `5. Any risks or opportunities to be aware of?`
    ].join("\n");

    try {
        const result = await llm.complete({
            systemPrompt,
            messages: [{ role: "user", content: userMessage }],
            tools: false,
            maxRounds: 1
        });
        return result.text;
    } catch (error) {
        console.error("Chief of Staff LLM reasoning failed:", error.message);
        return null;
    }
}

async function run(actor) {
    if (control.status().stopped) throw new Error("Global emergency stop is active");
    clearBriefingCache();
    const current = await snapshot();
    const reasoning = await reasonAboutState(current);

    const record = {
        id: crypto.randomUUID(),
        traceId: crypto.randomUUID(),
        actor,
        runAt: current.generatedAt,
        agentVersion: agent.version,
        outcome: "oversight-review-prepared",
        agentsReviewed: current.metrics.agentsOverseen,
        alertsPrepared: current.metrics.alerts,
        handoffsPrepared: current.handoffs.length,
        executedCount: 0,
        externalActions: 0,
        spend: 0,
        llmReasoning: reasoning || null,
        reasoningProvider: reasoning ? llm.status().provider : null
    };

    writeJsonAtomic(ledgerPath(), [...readJson(ledgerPath(), []), record].slice(-250));
    activity.append("prepared", `Chief of Staff prepared cross-agent review${reasoning ? " with LLM analysis" : ""}`, { source: agent.id, traceId: record.traceId, alerts: record.alertsPrepared });

    return record;
}

async function status() {
    const current = await snapshot();
    const recentRunsList = runs();
    const lastRunWithReasoning = recentRunsList.find(r => r.llmReasoning);
    const briefing = getBriefing();
    const briefingResult = Promise.race([
        briefing,
        new Promise(resolve => setTimeout(() => resolve({ reasoning: null, generatedAt: null }), 3000))
    ]);
    const resolved = await briefingResult;
    return {
        ...current,
        recentRuns: recentRunsList.slice(0, 20),
        runMetrics: { runs: recentRunsList.length, externalActions: 0, spend: 0 },
        lastReasoning: lastRunWithReasoning ? {
            reasoning: lastRunWithReasoning.llmReasoning,
            provider: lastRunWithReasoning.reasoningProvider,
            generatedAt: lastRunWithReasoning.runAt
        } : null,
        briefing: resolved.reasoning ? {
            reasoning: resolved.reasoning,
            generatedAt: resolved.generatedAt
        } : null
    };
}

let briefingCache = null;
let briefingCacheTime = 0;
let briefingPromise = null;
const BRIEFING_CACHE_TTL = 300000;

async function generateBriefing() {
    try {
        const current = await snapshot();
        const reasoning = await reasonAboutState(current);
        briefingCache = { reasoning, generatedAt: current.generatedAt };
        briefingCacheTime = Date.now();
        return briefingCache;
    } catch (e) {
        console.warn("[CoS] generateBriefing failed:", e.message);
        return briefingCache || { reasoning: null, generatedAt: null };
    } finally {
        briefingPromise = null;
    }
}

function getBriefing() {
    const now = Date.now();
    if (briefingCache && (now - briefingCacheTime) < BRIEFING_CACHE_TTL) {
        return Promise.resolve(briefingCache);
    }
    if (!briefingPromise) {
        briefingPromise = generateBriefing();
    }
    return briefingPromise.then(() => briefingCache || { reasoning: null, generatedAt: null });
}

function clearBriefingCache() {
    briefingCache = null;
    briefingCacheTime = 0;
    briefingPromise = null;
}

module.exports = { agent, run, runs, snapshot, status, getBriefing, clearBriefingCache };
