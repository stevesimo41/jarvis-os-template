const express = require("express");
const { requireRole } = require("../auth/localAuth");
const review = require("../services/agentReviewService");
const approvals = require("../governance/approvalService");
const audit = require("../governance/auditLog");
const { enrichProspect } = require("../services/prospectEnrichmentService");
const router = express.Router();
router.get("/", async (_req, res) => res.json({ ok: true, data: await review.inbox() }));
router.post("/approvals/:approvalId/approve", ...requireRole("owner"), async (req, res) => {
    try {
        let fullApproval;
        try { fullApproval = approvals.getApproval(req.params.approvalId); } catch (_e) { fullApproval = null; }
        const ctx = fullApproval?.context || {};
        const approval = approvals.approve(req.params.approvalId, { confirmation: req.body?.confirmation || "APPROVE", approvedBy: req.auth.name, requestId: req.id });
        audit.append("agent_hub_approval_granted", { actor: req.auth.name, requestId: req.id, approvalId: approval.id });

        let execution = null;
        const action = fullApproval?.action;

        if (action === "market_pulse_opportunity" && ctx.type === "market-opportunity") {
            const p = ctx.prospect || {};
            const opp = ctx.opportunity || {};
            const name = p.name || "";
            if (!name || name === "Unknown" || name === "N/A") {
                execution = { crm: false, skipped: true, reason: "placeholder name" };
            } else {
                const enriched = await enrichProspect({ name, website: p.sourceUrl || p.website || "", email: p.email || "", phone: p.phone || "", city: p.city || "", state: p.state || "" });
                const edata = enriched.data || {};
                const email = edata.email || p.email || "";
                const execName = edata.executiveName || p.executiveName || "";

                execution = {
                    enrichment: { email: email || null, phone: edata.phone || null, executiveName: execName || null },
                    note: "Prospect enriched. Connect your CRM to auto-add contacts."
                };
            }
        } else {
            execution = { note: "Approval recorded. Action: " + action };
        }

        return res.json({ ok: true, data: approval, execution });
    } catch (error) { return res.status(error.statusCode || 400).json({ ok: false, error: error.message }); }
});

router.post("/approvals/:approvalId/enrich-mpo", ...requireRole("owner"), async (req, res) => {
    try {
        let fullApproval;
        try { fullApproval = approvals.getApproval(req.params.approvalId); } catch (_e) { fullApproval = null; }
        if (!fullApproval || fullApproval.status !== "pending") {
            return res.status(404).json({ ok: false, error: "Approval not found or not pending" });
        }
        const ctx = fullApproval.context || {};
        const p = ctx.prospect || {};
        const opp = ctx.opportunity || {};
        const name = p.name || "";
        if (!name || name === "Unknown" || name === "N/A") {
            return res.status(400).json({ ok: false, error: "No company name to enrich" });
        }

        const enriched = await enrichProspect({ name, website: p.sourceUrl || p.website || "", email: p.email || "", phone: p.phone || "", city: p.city || "", state: p.state || "" });
        const edata = enriched.data || {};
        const email = edata.email || p.email || "";
        const phone = edata.phone || p.phone || "";
        const execName = edata.executiveName || p.executiveName || "";

        approvals.approve(req.params.approvalId, { confirmation: "APPROVE", approvedBy: req.auth.name, requestId: req.id });
        audit.append("agent_hub_mpo_enriched_approved", { actor: req.auth.name, requestId: req.id, approvalId: req.params.approvalId, emailFound: !!email });

        res.json({
            ok: true,
            data: {
                enrichment: { email: email || null, phone: phone || null, executiveName: execName || null, executiveTitle: edata.executiveTitle || null, sources: edata.sources || [] },
                note: "Prospect enriched. Connect your CRM to auto-add contacts."
            }
        });
    } catch (error) { return res.status(error.statusCode || 500).json({ ok: false, error: error.message }); }
});
router.post("/approvals/:approvalId/deny", ...requireRole("owner"), (req, res) => {
    try {
        const approval = approvals.deny(req.params.approvalId, { confirmation: req.body?.confirmation, deniedBy: req.auth.name, reason: req.body?.reason, requestId: req.id });
        audit.append("agent_hub_approval_denied", { actor: req.auth.name, requestId: req.id, approvalId: approval.id, reason: approval.denialReason });
        return res.json({ ok: true, data: approval });
    } catch (error) { return res.status(error.statusCode || 400).json({ ok: false, error: error.message }); }
});
module.exports = router;
