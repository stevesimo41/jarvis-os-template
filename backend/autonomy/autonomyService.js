const path = require("path");
const crypto = require("crypto");
const policy = require("../config/autonomyPolicies.json");
const control = require("../services/systemControlService");
const activity = require("../brain/activityService");
const { readJson, writeJsonAtomic } = require("../storage/atomicJsonStore");

function statePath() { return process.env.JARVIS_AUTONOMY_STATE_PATH || path.join(__dirname, "../data/governance/autonomy-state.json"); }
function initialState() { return { mode: policy.defaultMode, suspended: false, suspensionReason: null, failures: 0, reliability: { successfulRuns: 0, failedRuns: 0 }, updatedAt: null, updatedBy: null }; }
function state() { return readJson(statePath(), initialState()); }
function save(value) { return writeJsonAtomic(statePath(), value); }
function status() { return { policy, state: state(), systemControl: control.status(), effectiveExecution: false }; }
function deploy(mode, actor) {
    if (!policy.modes.includes(mode)) throw new Error("Unknown autonomy mode");
    if (mode === "bounded-autonomous" && state().reliability.successfulRuns < 25) throw new Error("Bounded autonomy requires 25 successful supervised runs");
    return save({ ...state(), mode, suspended: false, suspensionReason: null, updatedAt: new Date().toISOString(), updatedBy: actor });
}
function suspend(reason, actor = "jarvis-policy") { const current = state(); return save({ ...current, suspended: true, suspensionReason: String(reason).slice(0, 240), updatedAt: new Date().toISOString(), updatedBy: actor }); }
function evaluate(input = {}) {
    const current = state(); const system = control.status(); const reasons = [];
    if (system.stopped) reasons.push("global emergency stop is active");
    if (current.suspended) reasons.push("autonomy is suspended");
    if (!policy.actionAllowlist.includes(input.action)) reasons.push("action is not allowlisted");
    if (!policy.sourceAllowlist.includes(input.source)) reasons.push("source is not allowlisted");
    if ((Number(input.budget) || 0) > policy.maximumBudget) reasons.push("budget exceeds policy");
    if ((Number(input.confidence) || 0) < policy.suspension.minimumConfidence) reasons.push("confidence is below threshold");
    if (input.externalAction) reasons.push("external actions are disabled");
    return { allowed: reasons.length === 0, reasons, mode: current.mode, wouldExecute: false, requiresHumanApproval: true };
}
function run(input, actor) {
    const evaluation = evaluate(input); let current = state();
    if (!evaluation.allowed) {
        current = { ...current, failures: current.failures + 1, reliability: { ...current.reliability, failedRuns: current.reliability.failedRuns + 1 } };
        if (current.failures >= policy.suspension.maximumFailures) current = { ...current, suspended: true, suspensionReason: evaluation.reasons.join("; ") };
        save(current); activity.append("learned", "Autonomy run rejected by policy", { source: "autonomy", action: input.action, outcome: "rejected" });
        return { id: crypto.randomUUID(), actor, evaluation, executed: false, state: current };
    }
    current = { ...current, failures: 0, reliability: { ...current.reliability, successfulRuns: current.reliability.successfulRuns + 1 } }; save(current);
    activity.append("prepared", "Autonomy run prepared for human approval", { source: "autonomy", action: input.action, outcome: "prepared" });
    return { id: crypto.randomUUID(), actor, evaluation, executed: false, prepared: true, state: current };
}
function message(input, actor) { return { id: crypto.randomUUID(), traceId: input.traceId || crypto.randomUUID(), from: actor, to: String(input.to || "").slice(0, 80), type: String(input.type || "task-update").slice(0, 40), payload: input.payload || {}, timestamp: new Date().toISOString(), external: false }; }
module.exports = { status, deploy, suspend, evaluate, run, message };
