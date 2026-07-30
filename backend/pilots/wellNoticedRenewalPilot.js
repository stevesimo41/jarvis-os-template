const crypto = require("crypto");
const path = require("path");
const crm = require("../crm/crmEngine");
const autonomy = require("../autonomy/autonomyService");
const activity = require("../brain/activityService");
const { readJson, writeJsonAtomic } = require("../storage/atomicJsonStore");

function ledgerPath() {
    return process.env.JARVIS_RENEWAL_PILOT_LEDGER_PATH ||
        path.join(__dirname, "../data/revenuePilot/renewal-runs.json");
}

function eligibleOrganizations() {
    return crm.getEntity("organizations", "well-noticed").filter(item =>
        ["customer", "renewal"].includes(String(item.status || "").toLowerCase()) ||
        ["active", "partner"].includes(String(item.relationshipStatus || "").toLowerCase())
    );
}

function plan() {
    const candidates = eligibleOrganizations().map(item => ({
        id: item.id,
        name: item.name,
        owner: item.owner || process.env.JARVIS_OWNER_NAME || "owner",
        lastInteractionAt: item.lastOutreachAt || null,
        nextAction: "Review relationship history and prepare a renewal conversation brief"
    }));
    return {
        id: "well-noticed-renewal-shadow-v1",
        ventureId: "well-noticed",
        mode: "shadow",
        objective: "Identify existing partners ready for a governed renewal review.",
        candidateRules: ["customer or renewal status", "active or partner relationship"],
        candidates,
        candidateCount: candidates.length,
        blockers: candidates.length ? [] : ["No Well Noticed organizations are currently classified as customers, renewals, active relationships, or partners."],
        proposedExperiment: {
            hypothesis: "Structured renewal preparation will improve retained partner revenue.",
            successMetric: "Owner-approved renewal reviews completed and realized renewal revenue recorded.",
            durationDays: 30,
            spend: 0,
            externalActions: false
        }
    };
}

function runs() {
    return readJson(ledgerPath(), []).slice().reverse();
}

function run(actor) {
    const currentPlan = plan();
    const policy = autonomy.evaluate({
        action: "score_opportunity",
        source: "local-crm",
        confidence: 90,
        budget: 0,
        externalAction: false
    });
    const record = {
        id: crypto.randomUUID(),
        traceId: crypto.randomUUID(),
        runAt: new Date().toISOString(),
        actor,
        mode: "shadow",
        outcome: !policy.allowed ? "policy-blocked" : currentPlan.candidateCount ? "candidates-prepared" : "data-blocked",
        candidateCount: currentPlan.candidateCount,
        preparedCount: policy.allowed ? currentPlan.candidateCount : 0,
        executedCount: 0,
        externalActions: 0,
        spend: 0,
        realizedRevenue: 0,
        policy,
        blockers: [...currentPlan.blockers, ...policy.reasons]
    };
    const ledger = readJson(ledgerPath(), []);
    writeJsonAtomic(ledgerPath(), [...ledger, record].slice(-100));
    activity.append("learned", "Well Noticed renewal shadow pilot completed", {
        source: "revenue-pilot",
        ventureId: "well-noticed",
        outcome: record.outcome
    });
    return record;
}

function status() {
    const history = runs();
    return {
        plan: plan(),
        latestRun: history[0] || null,
        metrics: {
            runs: history.length,
            candidatesPrepared: history.reduce((sum, item) => sum + item.preparedCount, 0),
            executedActions: 0,
            externalActions: 0,
            spend: 0,
            realizedRevenue: history.reduce((sum, item) => sum + item.realizedRevenue, 0)
        }
    };
}

module.exports = { plan, run, runs, status };
