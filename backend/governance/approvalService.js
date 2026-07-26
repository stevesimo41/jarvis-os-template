const crypto = require("crypto");
const path = require("path");
const { readJson, writeJsonAtomic } = require("../storage/atomicJsonStore");

const DATA_PATH = path.join(__dirname, "../data/governance/approvals.json");
const POLICIES_PATH = path.join(__dirname, "../config/approvalPolicies.json");

function loadApprovals() {
    return readJson(DATA_PATH, []);
}

function saveApprovals(list) {
    writeJsonAtomic(DATA_PATH, list);
}

function loadPolicies() {
    return readJson(POLICIES_PATH, { version: 1, defaultTtlMinutes: 1440, actions: {} });
}

function requestApproval({ action, ventureId, requestedBy, context }) {
    const policies = loadPolicies();
    const policy = policies.actions[action] || { execution: "internal_task_only", externalActions: false, maximumBudget: 0 };
    const now = new Date();
    const expiresAt = new Date(now.getTime() + (policies.defaultTtlMinutes || 1440) * 60000);

    const record = {
        id: crypto.randomUUID(),
        status: "pending",
        action,
        ventureId: ventureId || null,
        organizationId: null,
        requestedBy: requestedBy || "system",
        requestedAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
        requestId: null,
        policy: { id: `policy-v1:${action}`, ...policy },
        context: context || null
    };

    const list = loadApprovals();
    list.push(record);
    saveApprovals(list);
    return record;
}

function getApproval(id) {
    const list = loadApprovals();
    return list.find(a => a.id === id) || null;
}

function listApprovals(filter = {}) {
    let list = loadApprovals();
    if (filter.status) list = list.filter(a => a.status === filter.status);
    if (filter.ventureId) list = list.filter(a => a.ventureId === filter.ventureId);
    return list;
}

function approve(id, { confirmation, approvedBy, requestId } = {}) {
    const list = loadApprovals();
    const idx = list.findIndex(a => a.id === id);
    if (idx < 0) throw Object.assign(new Error("Approval not found"), { statusCode: 404 });
    if (list[idx].status !== "pending") throw Object.assign(new Error("Approval not pending"), { statusCode: 400 });

    list[idx].status = "approved";
    list[idx].approvedBy = approvedBy || "owner";
    list[idx].approvedAt = new Date().toISOString();
    saveApprovals(list);
    return list[idx];
}

function deny(id, { deniedBy, reason, requestId } = {}) {
    const list = loadApprovals();
    const idx = list.findIndex(a => a.id === id);
    if (idx < 0) throw Object.assign(new Error("Approval not found"), { statusCode: 404 });

    list[idx].status = "denied";
    list[idx].deniedBy = deniedBy || "owner";
    list[idx].deniedAt = new Date().toISOString();
    list[idx].denyReason = reason || "";
    saveApprovals(list);
    return list[idx];
}

function publicApproval(record) {
    const { context, ...rest } = record;
    return rest;
}

module.exports = { requestApproval, getApproval, listApprovals, approve, deny, publicApproval };
