const crypto = require("crypto");
const crm = require("../crm/crmEngine");
const workflow = require("./crmWorkflowOrchestrator");
const approvalService = require("../governance/approvalService");
const auditLog = require("../governance/auditLog");

function currentAction(ventureId, organizationId) {
    return workflow.planOrganization(organizationId, ventureId).decision.action;
}

function request(input) {
    const action = currentAction(input.ventureId, input.organizationId);
    return approvalService.requestApproval({
        action,
        ventureId: input.ventureId,
        organizationId: input.organizationId,
        requestedBy: input.requestedBy,
        requestId: input.requestId,
        context: { actionAtRequest: action }
    });
}

function execute(input) {
    const action = currentAction(input.ventureId, input.organizationId);
    approvalService.assertApproved(input.approvalId, {
        action,
        ventureId: input.ventureId,
        organizationId: input.organizationId
    });
    const existingTask = crm.getEntity("tasks", input.ventureId).find(task =>
        task.organizationId === input.organizationId &&
        task.action === action &&
        task.status === "pending"
    );

    if (existingTask) {
        throw approvalService.governanceError(
            "DUPLICATE_PENDING_ACTION",
            `A pending task already exists for action: ${action}`,
            409
        );
    }

    const approval = approvalService.consume(
        input.approvalId,
        {
            action,
            ventureId: input.ventureId,
            organizationId: input.organizationId
        },
        input.requestId
    );

    try {
        const task = crm.createEntity("tasks", {
            id: crypto.randomUUID(),
            ventureId: input.ventureId,
            organizationId: input.organizationId,
            type: "governed_execution",
            action,
            title: `Execute approved action: ${action}`,
            description: "Approved internal CRM task created by the governed execution workflow.",
            status: "pending",
            priority: "high",
            assignedTo: "jarvis",
            source: "governed_workflow",
            approvalId: approval.id,
            externalActions: false
        });

        auditLog.append("governed_execution_completed", {
            approvalId: approval.id,
            action,
            ventureId: input.ventureId,
            organizationId: input.organizationId,
            taskId: task.id,
            crmMutations: true,
            externalActions: false,
            requestId: input.requestId || null
        });

        return {
            action,
            approval,
            task,
            execution: {
                executed: true,
                crmMutations: true,
                externalActions: false,
                status: "internal_task_created"
            }
        };
    } catch (error) {
        auditLog.append("governed_execution_failed", {
            approvalId: approval.id,
            action,
            error: error.message,
            requestId: input.requestId || null
        });
        throw error;
    }
}

module.exports = {
    request,
    execute
};
