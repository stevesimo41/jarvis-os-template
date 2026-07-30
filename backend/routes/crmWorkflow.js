const express = require("express");

const workflow = require("../workflows/crmWorkflowOrchestrator");
const discoveryWorkflow = require("../workflows/prospectDiscoveryWorkflow");
const executionBridge = require("../workflows/crmExecutionBridge");
const governedExecution = require("../workflows/governedCrmExecution");
const approvalService = require("../governance/approvalService");
const auditLog = require("../governance/auditLog");
const { requireRole } = require("../auth/localAuth");
const { sendSuccess, sendError } = require("../http/apiResponse");
const systemControl = require("../services/systemControlService");

const router = express.Router();

function workflowError(req, res, error) {
    const message = error?.message || "CRM workflow failed.";
    if (error?.code && error?.statusCode) {
        return sendError(req, res, {
            statusCode: error.statusCode,
            code: error.code,
            message
        });
    }
    const notFound = /not found|unknown venture/i.test(message);
    const invalid = /required|only simulation|must be an array|must be an object|maximum/i.test(message);

    return sendError(req, res, {
        statusCode: notFound ? 404 : invalid ? 400 : 500,
        code: notFound
            ? "RESOURCE_NOT_FOUND"
            : invalid
                ? "INVALID_REQUEST"
                : "WORKFLOW_ERROR",
        message
    });
}

router.post("/discover", (req, res) => {
    try {
        const { ventureId, candidates = null, mode = "simulate" } = req.body || {};

        if (!ventureId) {
            throw new Error("ventureId is required");
        }

        if (mode !== "simulate") {
            throw new Error("Only simulation mode is enabled.");
        }

        if (candidates !== null && !Array.isArray(candidates)) {
            throw new Error("candidates must be an array");
        }

        if (candidates && candidates.length > 250) {
            throw new Error("A maximum of 250 candidates is allowed");
        }

        if (
            candidates &&
            candidates.some(candidate =>
                !candidate ||
                typeof candidate !== "object" ||
                Array.isArray(candidate)
            )
        ) {
            throw new Error("Each candidate must be an object");
        }

        const result = discoveryWorkflow.discoverVenture(
            ventureId,
            candidates,
            mode
        );

        return sendSuccess(req, res, {
            workflow: "prospect_discovery",
            result
        }, {
            meta: {
                mode,
                crmMutations: false,
                externalActions: false
            }
        });
    } catch (error) {
        return workflowError(req, res, error);
    }
});

router.post("/plan", (req, res) => {
    try {
        const { ventureId, organizationId } = req.body || {};

        if (!ventureId) {
            throw new Error("ventureId is required");
        }

        const mode = organizationId ? "organization" : "venture";
        const result = organizationId
            ? workflow.planOrganization(organizationId, ventureId)
            : workflow.planVenture(ventureId);

        return sendSuccess(req, res, {
            workflow: "action_planning",
            mode,
            result
        }, {
            meta: {
                crmMutations: false,
                externalActions: false
            }
        });
    } catch (error) {
        return workflowError(req, res, error);
    }
});

router.get("/next", (req, res) => {
    try {
        const ventureId = req.query.venture;

        if (!ventureId) {
            throw new Error("venture query parameter is required");
        }

        return sendSuccess(req, res, {
            workflow: "next_action",
            result: workflow.getNextAction(ventureId)
        }, {
            meta: {
                crmMutations: false,
                externalActions: false
            }
        });
    } catch (error) {
        return workflowError(req, res, error);
    }
});

router.post("/simulate", (req, res) => {
    try {
        const { ventureId, organizationId, mode = "simulate" } = req.body || {};

        if (!ventureId) {
            throw new Error("ventureId is required");
        }

        if (!organizationId) {
            throw new Error("organizationId is required");
        }

        const result = executionBridge.executeOrganization(
            organizationId,
            ventureId,
            mode
        );

        return sendSuccess(req, res, {
            workflow: "execution_simulation",
            result
        }, {
            meta: {
                mode,
                crmMutations: false,
                externalActions: false
            }
        });
    } catch (error) {
        return workflowError(req, res, error);
    }
});

router.post("/approval/request", ...requireRole("operator"), (req, res) => {
    try {
        const { ventureId, organizationId } = req.body || {};

        if (!ventureId) {
            throw new Error("ventureId is required");
        }

        if (!organizationId) {
            throw new Error("organizationId is required");
        }

        const approval = governedExecution.request({
            ventureId,
            organizationId,
            requestedBy: req.auth.name,
            requestId: req.id
        });

        return sendSuccess(req, res, {
            workflow: "approval_request",
            approval
        }, {
            statusCode: 201,
            meta: {
                crmMutations: false,
                governanceMutations: true,
                externalActions: false
            }
        });
    } catch (error) {
        return workflowError(req, res, error);
    }
});

router.post("/approval/:approvalId/approve", ...requireRole("owner"), (req, res) => {
    try {
        const approval = approvalService.approve(
            req.params.approvalId,
            {
                confirmation: req.body?.confirmation,
                approvedBy: req.auth.name,
                requestId: req.id
            }
        );

        return sendSuccess(req, res, {
            workflow: "approval_grant",
            approval
        }, {
            meta: {
                crmMutations: false,
                governanceMutations: true,
                externalActions: false
            }
        });
    } catch (error) {
        return workflowError(req, res, error);
    }
});

router.get("/approval/:approvalId", ...requireRole("operator"), (req, res) => {
    try {
        const approval = approvalService.getApproval(req.params.approvalId);
        const { context, ...safeApproval } = approval;

        return sendSuccess(req, res, {
            workflow: "approval_status",
            approval: safeApproval
        }, {
            meta: {
                crmMutations: false,
                governanceMutations: false,
                externalActions: false
            }
        });
    } catch (error) {
        return workflowError(req, res, error);
    }
});

router.post("/execute", ...requireRole("operator"), (req, res) => {
    try {
        if (systemControl.status().stopped) {
            const error = new Error("Global emergency stop is active");
            error.code = "SYSTEM_STOPPED";
            error.statusCode = 423;
            throw error;
        }
        const { approvalId, ventureId, organizationId } = req.body || {};

        if (!approvalId) {
            throw new Error("approvalId is required");
        }

        if (!ventureId) {
            throw new Error("ventureId is required");
        }

        if (!organizationId) {
            throw new Error("organizationId is required");
        }

        const result = governedExecution.execute({
            approvalId,
            ventureId,
            organizationId,
            requestId: req.id
        });

        return sendSuccess(req, res, {
            workflow: "governed_execution",
            result
        }, {
            meta: {
                crmMutations: true,
                governanceMutations: true,
                externalActions: false
            }
        });
    } catch (error) {
        return workflowError(req, res, error);
    }
});

router.get("/audit", ...requireRole("owner"), (req, res) => {
    const parsedLimit = Number.parseInt(req.query.limit, 10);
    const limit = Number.isFinite(parsedLimit) ? parsedLimit : 50;

    return sendSuccess(req, res, {
        workflow: "governance_audit",
        events: auditLog.list(limit)
    }, {
        meta: {
            crmMutations: false,
            governanceMutations: false,
            externalActions: false
        }
    });
});

module.exports = router;
