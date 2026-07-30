const crypto = require("crypto");
const path = require("path");
const pilot = require("../pilots/wellNoticedRenewalPilot");
const control = require("../services/systemControlService");
const activity = require("../brain/activityService");
const { readJson, writeJsonAtomic } = require("../storage/atomicJsonStore");

const AGENTS = [{
    id: "well-noticed-renewal-agent",
    name: "Well Noticed Renewal Agent",
    version: "1.0",
    serviceType: "revenue-retention",
    ventureId: "well-noticed",
    workflow: "renewal-review",
    mode: "supervised",
    capabilities: ["read_local_crm", "score_renewal_candidates", "prepare_internal_brief"],
    prohibitedActions: ["contact_partner", "modify_crm", "spend_money", "publish", "transact"]
}];

const CONNECTORS = [{ id: "local-crm", type: "repository", approved: true, access: "read-only", freshness: "point-in-time" },
    { id: "canonical-brain", type: "context", approved: true, access: "read-only", freshness: "live-local" },
    { id: "approved-research-source", type: "external-research", approved: false, access: "disabled", freshness: "unavailable" }];

function schedulesPath() {
    return process.env.JARVIS_AGENT_SCHEDULES_PATH || path.join(__dirname, "../data/agents/schedules.json");
}

function runsPath() {
    return process.env.JARVIS_AGENT_RUNS_PATH || path.join(__dirname, "../data/agents/runs.json");
}

function initialSchedules() {
    return [{
        id: "well-noticed-weekly-renewal-review",
        agentId: "well-noticed-renewal-agent",
        frequency: "weekly",
        enabled: false,
        automaticExecution: false,
        requiresOperatorRun: true,
        lastRunAt: null,
        updatedAt: null,
        updatedBy: null
    }];
}

function schedules() { return readJson(schedulesPath(), initialSchedules()); }
function runs() { return readJson(runsPath(), []).slice().reverse(); }

function setSchedule(id, enabled, actor) {
    const records = schedules();
    const index = records.findIndex(item => item.id === id);
    if (index === -1) throw new Error("Production agent schedule not found");
    records[index] = { ...records[index], enabled: Boolean(enabled), automaticExecution: false, updatedAt: new Date().toISOString(), updatedBy: actor };
    writeJsonAtomic(schedulesPath(), records);
    activity.append("observed", `Production agent schedule ${enabled ? "enabled" : "disabled"}`, { source: "production-agents", scheduleId: id, actor });
    return records[index];
}

function status() {
    const history = runs();
    return {
        foundation: "production-agent-v1",
        agents: AGENTS,
        connectors: CONNECTORS,
        schedules: schedules(),
        recentRuns: history.slice(0, 20),
        metrics: {
            runs: history.length,
            prepared: history.reduce((sum, item) => sum + item.preparedCount, 0),
            externalActions: 0,
            crmMutations: 0,
            spend: 0,
            realizedRevenue: 0
        },
        boundaries: { backgroundExecution: false, humanApprovalRequired: true, externalActions: false, maximumBudget: 0 }
    };
}

function runSupervised(input, actor) {
    const schedule = schedules().find(item => item.id === input.scheduleId);
    if (!schedule) throw new Error("Production agent schedule not found");
    if (!schedule.enabled) throw new Error("Schedule must be enabled by the owner before a supervised run");
    if (control.status().stopped) throw new Error("Global emergency stop is active");
    const agent = AGENTS.find(item => item.id === schedule.agentId);
    const pilotRun = pilot.run(actor);
    const record = {
        id: crypto.randomUUID(),
        traceId: pilotRun.traceId,
        agentId: agent.id,
        agentVersion: agent.version,
        scheduleId: schedule.id,
        mode: "supervised",
        startedAt: pilotRun.runAt,
        completedAt: new Date().toISOString(),
        actor,
        connectorIds: CONNECTORS.filter(item => item.approved).map(item => item.id),
        outcome: pilotRun.outcome,
        candidateCount: pilotRun.candidateCount,
        preparedCount: pilotRun.preparedCount,
        executedCount: 0,
        externalActions: 0,
        crmMutations: 0,
        spend: 0,
        realizedRevenue: 0,
        blockers: pilotRun.blockers
    };
    const history = readJson(runsPath(), []);
    writeJsonAtomic(runsPath(), [...history, record].slice(-250));
    const records = schedules();
    const index = records.findIndex(item => item.id === schedule.id);
    records[index] = { ...records[index], lastRunAt: record.completedAt };
    writeJsonAtomic(schedulesPath(), records);
    activity.append("prepared", "Supervised production agent run completed", { source: "production-agents", agentId: agent.id, traceId: record.traceId, outcome: record.outcome });
    return record;
}

module.exports = { status, schedules, runs, setSchedule, runSupervised };
