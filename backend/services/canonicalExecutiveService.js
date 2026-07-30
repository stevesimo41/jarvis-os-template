const fs = require("fs");
const path = require("path");
const context = require("../brain/canonicalContextService");
const opportunityEngine = require("../opportunities/opportunityEngine");
const productionAgents = require("../agents/productionAgentService");

function records(type) { return context.assemble({ include: type }).collections[type] || []; }
function raw(type) { return records(type).map(item => item.data); }
function goals() { return raw("goals").filter(item => item.status !== "completed").sort((a, b) => (b.priority || 0) - (a.priority || 0)); }

function loadVision() {
    try {
        const goalsPath = path.join(__dirname, "../../memory/context/goals.json");
        const data = JSON.parse(fs.readFileSync(goalsPath, "utf8"));
        return data.vision || null;
    } catch (_e) { return null; }
}

function loadExecutiveContext() {
    try {
        const execPath = path.join(__dirname, "../../memory/context/executive.json");
        return JSON.parse(fs.readFileSync(execPath, "utf8"));
    } catch (_e) { return {}; }
}

function getDailyPrioritiesBrief() {
    try {
        const dailyPriorities = require("./dailyPrioritiesService");
        const result = dailyPriorities.generateDailyPriorities();
        return result;
    } catch (_e) {
        return null;
    }
}

function getApprovalPreferences() {
    try {
        const dailyPriorities = require("./dailyPrioritiesService");
        return dailyPriorities.getUserPreferences();
    } catch (_e) {
        return null;
    }
}

function state() {
    const currentGoals = goals();
    const ventures = raw("ventures");
    const tasks = raw("tasks");
    let opportunities = { length: 0, filter: () => [], slice: () => [] };
    try { opportunities = opportunityEngine.inbox(); } catch (_e) {}
    const agents = productionAgents.status();
    const primary = currentGoals[0] || { name: "No active canonical goal", priority: 0, nextMilestone: "Record an active goal" };
    const dailyBrief = getDailyPrioritiesBrief();
    const prefs = getApprovalPreferences();
    const vision = loadVision();
    const execContext = loadExecutiveContext();
    return {
        generatedAt: new Date().toISOString(),
        source: "canonical-context-v1",
        freshness: context.assemble({ include: "goals,ventures,tasks,opportunities" }).synchronization.sourceStatus,
        primaryGoal: primary,
        goals: currentGoals,
        vision: vision,
        executive: {
            mission: execContext.mission,
            primaryFocus: execContext.primaryFocus,
            endState: execContext.endState,
            priorities: execContext.priorities,
            agentCommunication: execContext.agentCommunication,
            futureCapabilities: execContext.futureCapabilities,
            constraints: execContext.constraints
        },
        ventures,
        tasks: { total: tasks.length, pending: tasks.filter(item => item.status !== "completed").length, records: tasks.slice(0, 10) },
        opportunities: { total: opportunities.length, qualified: opportunities.filter(item => item.score >= 70).length, records: opportunities.slice(0, 5) },
        productionAgents: { registered: agents.agents.length, schedulesEnabled: agents.schedules.filter(item => item.enabled).length, runs: agents.metrics.runs },
        externalSynchronization: false,
        dailyBrief,
        approvalPreferences: prefs
    };
}

function brief() {
    const current = state();
    const primary = current.primaryGoal;
    const revenue = current.opportunities.records[0];

    const dailyPriorities = current.dailyBrief?.priorities || [];
    const prefs = current.approvalPreferences;

    const priorityItem = dailyPriorities[0] || { title: primary.name, detail: primary.nextMilestone };
    const priorityName = priorityItem.title || primary.name;
    const priorityMilestone = priorityItem.detail || primary.nextMilestone || "No milestone recorded";

    const executionPlan = dailyPriorities.map(p => ({
        name: p.title,
        description: p.detail,
        category: p.category,
        rank: p.rank
    }));

    const categoryRankings = prefs?.categoryRankings || {};
    const topCategory = Object.entries(categoryRankings)
        .sort(([, a], [, b]) => b - a)
        .map(([cat]) => cat)[0];

    const activeGoals = current.goals.filter(g => g.status === "active" || g.status === "paused");

    return {
        generatedAt: current.generatedAt,
        provenance: { source: current.source, externalSynchronization: false },
        vision: current.vision,
        executive: current.executive,
        priority: {
            name: priorityName,
            executiveScore: Number(primary.priority || 0),
            nextMilestone: priorityMilestone
        },
        revenueOpportunity: revenue ? { name: revenue.title, nextAction: revenue.nextAction } : { name: "No canonical revenue opportunity", nextAction: "Review the opportunity portfolio" },
        capitalOpportunity: { name: "No canonical capital opportunity", nextAction: "Record evidence before displaying a capital recommendation" },
        researchPriority: topCategory
            ? { name: `You value ${topCategory} most`, nextAction: "Based on your daily mission approvals" }
            : { name: revenue?.title || primary.name, nextAction: revenue?.nextAction || primary.nextMilestone || "Record a next action" },
        executionPlan: executionPlan.length ? executionPlan : [primary.nextMilestone || "Record a canonical task"],
        opportunityPipeline: current.opportunities.records,
        activeGoals: activeGoals.map(g => ({ name: g.name, category: g.category, priority: g.priority, progress: g.progress, status: g.status, nextMilestone: g.nextMilestone })),
        learningInsights: {
            source: "daily-priorities-plus-canonical",
            patterns: [],
            approvalHistory: prefs?.totalApprovals || 0,
            topCategory: topCategory || "none yet"
        },
        recommendation: {
            action: priorityItem.detail || primary.nextMilestone || "Record a next action",
            confidence: priorityItem.confidence || 50
        },
        selfImprovement: {
            status: prefs?.totalApprovals > 5 ? "learning active" : prefs?.totalApprovals > 0 ? "learning started" : "awaiting first approval",
            totalApprovals: prefs?.totalApprovals || 0
        }
    };
}

function mission() {
    const current = state();
    const dailyPriorities = current.dailyBrief?.priorities || [];
    const exec = current.executive;
    return {
        status: current.primaryGoal.name === "No active canonical goal" ? "NEEDS INPUT" : "ACTIVE",
        mission: exec?.mission || current.primaryGoal.name,
        primaryFocus: exec?.primaryFocus || current.primaryGoal.nextMilestone,
        message: "Built from canonical goals, daily priorities, vision, and your approval history.",
        actions: dailyPriorities.length
            ? dailyPriorities.map(p => ({ name: p.title, description: p.detail, category: p.category }))
            : current.tasks.records.length
                ? current.tasks.records
                : [{ name: current.primaryGoal.nextMilestone || "Record a canonical task", description: `Next milestone for ${current.primaryGoal.name}` }],
        provenance: { source: current.source, externalSynchronization: false }
    };
}

module.exports = { state, brief, mission };
