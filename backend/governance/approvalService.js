const path = require("path");
const crypto = require("crypto");
const { readJson, writeJsonAtomic } = require("../storage/atomicJsonStore");
const auditLog = require("./auditLog");
const approvalPolicy = require("./approvalPolicy");


function approvalsPath() {
    return process.env.JARVIS_APPROVALS_PATH ||
        path.join(__dirname, "../data/governance/approvals.json");
}

function readApprovals() {
    return readJson(approvalsPath(), []);
}

function listApprovals() {
    return readApprovals().map(item => ({
        ...publicApproval(item),
        context: item.context || {}
    })).slice().reverse();
}

function saveApprovals(approvals) {
    return writeJsonAtomic(approvalsPath(), approvals);
}

function governanceError(code, message, statusCode = 400) {
    const error = new Error(message);
    error.code = code;
    error.statusCode = statusCode;
    return error;
}

function publicApproval(approval) {
    const { context, ...safe } = approval;
    return safe;
}

function requestApproval(input) {
    const now = Date.now();
    const policy = approvalPolicy.forAction(input.action);
    const approval = {
        id: crypto.randomUUID(),
        status: "pending",
        action: input.action,
        ventureId: input.ventureId,
        organizationId: input.organizationId,
        requestedBy: input.requestedBy || process.env.JARVIS_OWNER_NAME || "owner",
        requestedAt: new Date(now).toISOString(),
        expiresAt: new Date(now + policy.ttlMinutes * 60 * 1000).toISOString(),
        requestId: input.requestId || null,
        policy: {
            id: policy.id,
            execution: policy.execution,
            externalActions: policy.externalActions,
            maximumBudget: policy.maximumBudget
        },
        context: input.context || {}
    };

    const approvals = readApprovals();
    approvals.push(approval);
    saveApprovals(approvals);
    auditLog.append("approval_requested", {
        approvalId: approval.id,
        action: approval.action,
        ventureId: approval.ventureId,
        organizationId: approval.organizationId,
        actor: approval.requestedBy,
        requestId: approval.requestId,
        policyId: approval.policy.id
    });
    return publicApproval(approval);
}

function getApproval(id) {
    const approval = readApprovals().find(item => item.id === id);

    if (!approval) {
        throw governanceError("APPROVAL_NOT_FOUND", "Approval not found", 404);
    }

    return approval;
}

function approve(id, input = {}) {
    if (input.confirmation !== "APPROVE") {
        throw governanceError(
            "APPROVAL_CONFIRMATION_REQUIRED",
            "confirmation must exactly equal APPROVE"
        );
    }

    if (!input.approvedBy) {
        throw governanceError("INVALID_REQUEST", "approvedBy is required");
    }

    const approvals = readApprovals();
    const index = approvals.findIndex(item => item.id === id);

    if (index === -1) {
        throw governanceError("APPROVAL_NOT_FOUND", "Approval not found", 404);
    }

    const approval = approvals[index];

    if (approval.status !== "pending") {
        throw governanceError("APPROVAL_NOT_PENDING", "Approval is not pending", 409);
    }

    if (Date.parse(approval.expiresAt) <= Date.now()) {
        approval.status = "expired";
        saveApprovals(approvals);
        throw governanceError("APPROVAL_EXPIRED", "Approval has expired", 409);
    }

    approvals[index] = {
        ...approval,
        status: "approved",
        approvedBy: input.approvedBy,
        approvedAt: new Date().toISOString()
    };
    saveApprovals(approvals);
    auditLog.append("approval_granted", {
        approvalId: id,
        action: approval.action,
        actor: input.approvedBy,
        requestId: input.requestId || null
    });
    return publicApproval(approvals[index]);
}

function deny(id, input = {}) {
    if (input.confirmation !== "DENY") {
        throw governanceError(
            "APPROVAL_CONFIRMATION_REQUIRED",
            "confirmation must exactly equal DENY"
        );
    }

    if (!input.deniedBy) {
        throw governanceError("INVALID_REQUEST", "deniedBy is required");
    }

    const approvals = readApprovals();
    const index = approvals.findIndex(item => item.id === id);

    if (index === -1) {
        throw governanceError("APPROVAL_NOT_FOUND", "Approval not found", 404);
    }

    const approval = approvals[index];

    if (approval.status !== "pending") {
        throw governanceError("APPROVAL_NOT_PENDING", "Approval is not pending", 409);
    }

    approvals[index] = {
        ...approval,
        status: "denied",
        deniedBy: input.deniedBy,
        deniedAt: new Date().toISOString(),
        denialReason: String(input.reason || "").trim().slice(0, 500)
    };
    saveApprovals(approvals);
    auditLog.append("approval_denied", {
        approvalId: id,
        action: approval.action,
        actor: input.deniedBy,
        reason: approvals[index].denialReason,
        requestId: input.requestId || null
    });
    return publicApproval(approvals[index]);
}

function assertApprovedRecord(approval, expected) {

    const currentPolicy = approvalPolicy.forAction(expected.action);

    if (approval.status !== "approved") {
        throw governanceError("APPROVAL_NOT_APPROVED", "Approval is not approved", 409);
    }

    if (Date.parse(approval.expiresAt) <= Date.now()) {
        throw governanceError("APPROVAL_EXPIRED", "Approval has expired", 409);
    }

    if (
        approval.action !== expected.action ||
        approval.ventureId !== expected.ventureId ||
        approval.organizationId !== expected.organizationId
    ) {
        throw governanceError(
            "APPROVAL_SCOPE_MISMATCH",
            "Approval does not match the current action scope",
            409
        );
    }

    if (
        approval.policy?.id !== currentPolicy.id ||
        currentPolicy.externalActions !== false ||
        currentPolicy.maximumBudget !== 0
    ) {
        throw governanceError(
            "APPROVAL_POLICY_MISMATCH",
            "Approval no longer matches the active governance policy",
            409
        );
    }

    return approval;
}

function assertApproved(id, expected) {
    return publicApproval(assertApprovedRecord(getApproval(id), expected));
}

function consume(id, expected, requestId) {
    const approvals = readApprovals();
    const index = approvals.findIndex(item => item.id === id);

    if (index === -1) {
        throw governanceError("APPROVAL_NOT_FOUND", "Approval not found", 404);
    }

    const approval = assertApprovedRecord(approvals[index], expected);

    approvals[index] = {
        ...approval,
        status: "consumed",
        consumedAt: new Date().toISOString(),
        consumedRequestId: requestId || null
    };
    saveApprovals(approvals);
    auditLog.append("approval_consumed", {
        approvalId: id,
        action: approval.action,
        requestId: requestId || null
    });
    return publicApproval(approvals[index]);
}

function getDeniedProspectNames(actionType) {
    const approvals = readApprovals();
    return approvals
        .filter(a => a.status === "denied" && a.action === (actionType || "add_prospects_to_crm"))
        .map(a => {
            const ctx = a.context || {};
            const p = ctx.prospect || {};
            const name = (p.name || "").toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
            return name;
        })
        .filter(Boolean);
}

function updateApprovalContext(id, contextPatch) {
    const approvals = readApprovals();
    const index = approvals.findIndex(item => item.id === id);
    if (index === -1) throw governanceError("APPROVAL_NOT_FOUND", "Approval not found", 404);
    approvals[index].context = {
        ...approvals[index].context,
        ...contextPatch,
        prospect: {
            ...(approvals[index].context?.prospect || {}),
            ...(contextPatch.prospect || {})
        }
    };
    saveApprovals(approvals);
    return publicApproval(approvals[index]);
}

module.exports = {
    listApprovals,
    requestApproval,
    getApproval,
    approve,
    deny,
    updateApprovalContext,
    assertApproved,
    consume,
    governanceError,
    getDeniedProspectNames
};
