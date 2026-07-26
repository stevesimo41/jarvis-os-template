const express = require("express");
const { requireRole } = require("../auth/localAuth");
const approvals = require("../governance/approvalService");
const audit = require("../governance/auditLog");
const { enrichProspect } = require("../services/prospectEnrichmentService");
const router = express.Router();

function buildActions() {
    const actions = [];
    const approvalRecords = approvals.listApprovals();

    for (const a of approvalRecords) {
        if (a.status !== "pending") continue;
        const ctx = a.context || {};
        const prospect = ctx.prospect || {};
        const opportunity = ctx.opportunity || {};
        const isMarketOpp = ctx.type === "market-opportunity";
        const isProspect = ctx.type === "new-prospect";

        if (isMarketOpp) {
            actions.push({
                id: a.id,
                source: "market-pulse",
                sourceLabel: "Market Pulse",
                type: "approval",
                actionType: a.action,
                title: `MPO \u00b7 ${prospect.name || "Unknown"} \u2014 ${opportunity.capability || "Market Signal"}`,
                subtitle: `${prospect.category || ""} \u00b7 ${prospect.city || ""}, ${prospect.state || ""}`,
                description: [
                    prospect.category ? `Category: ${prospect.category}` : "",
                    prospect.fitScore ? `Relevance: ${Math.round(prospect.fitScore / 10)}/10` : "",
                    prospect.city ? `${prospect.city}, ${prospect.state || ""}` : "",
                    opportunity.service || ""
                ].filter(Boolean).join(" \u00b7 "),
                prospectDetails: {
                    name: prospect.name || "",
                    website: prospect.sourceUrl || prospect.website || "",
                    category: prospect.category || "",
                    fitScore: prospect.fitScore || 0,
                    fitGrade: prospect.fitGrade || "",
                    city: prospect.city || "",
                    state: prospect.state || "",
                    email: prospect.email || "",
                    executiveName: prospect.executiveName || "",
                    specificStrength: opportunity.capability || "",
                    source: "market-pulse"
                },
                opportunity: {
                    capability: opportunity.capability || "",
                    pitch: opportunity.pitch || "",
                    service: opportunity.service || "",
                    sourceUrl: opportunity.sourceUrl || "",
                    marketSignal: opportunity.marketSignal || ""
                },
                approvalId: a.id,
                buttons: ["approve", "deny"],
                priority: (prospect.fitScore || 0) >= 70 ? "high" : "normal",
                createdAt: a.requestedAt
            });
        } else {
            actions.push({
                id: a.id,
                source: "system",
                sourceLabel: "System",
                type: "approval",
                actionType: a.action,
                title: isProspect
                    ? `${prospect.name || "Unknown"}`
                    : a.action === "enrich_crm_prospect"
                    ? `Enrich: ${prospect.name || "Unknown"}`
                    : a.title || a.action || "Approval needed",
                subtitle: isProspect ? "Add to CRM" : "",
                description: [
                    prospect.category ? `Category: ${prospect.category}` : "",
                    prospect.fitScore ? `Fit: ${prospect.fitScore}/100` : "",
                    prospect.city ? `${prospect.city}, ${prospect.state || ""}` : "",
                    prospect.email ? `Email: ${prospect.email}` : ""
                ].filter(Boolean).join(" \u00b7 "),
                prospectDetails: {
                    name: prospect.name || "",
                    website: prospect.sourceUrl || prospect.website || "",
                    category: prospect.category || "",
                    fitScore: prospect.fitScore || 0,
                    fitGrade: prospect.fitGrade || "",
                    city: prospect.city || "",
                    state: prospect.state || "",
                    email: prospect.email || "",
                    executiveName: prospect.executiveName || "",
                    specificStrength: prospect.specificStrength || "",
                    source: prospect.source || ""
                },
                approvalId: a.id,
                buttons: ["enrich", "approve", "deny"],
                priority: isProspect && (prospect.fitScore || 0) >= 70 ? "high" : "normal",
                createdAt: a.requestedAt
            });
        }
    }

    actions.sort((a, b) => {
        if (a.priority === "high" && b.priority !== "high") return -1;
        if (b.priority === "high" && a.priority !== "high") return 1;
        return 0;
    });

    return actions;
}

router.get("/", ...requireRole("viewer"), (_req, res) => {
    try {
        const actions = buildActions();
        res.json({ ok: true, data: { actions, total: actions.length, timestamp: new Date().toISOString() } });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
});

router.post("/approve/:id", ...requireRole("owner"), async (req, res) => {
    try {
        let fullApproval;
        try { fullApproval = approvals.getApproval(req.params.id); } catch (_e) { fullApproval = null; }
        const ctx = fullApproval?.context || {};
        const approval = approvals.approve(req.params.id, {
            confirmation: req.body?.confirmation || "APPROVE",
            approvedBy: req.auth.name,
            requestId: req.id
        });
        audit.append("today_actions_approved", { actor: req.auth.name, requestId: req.id, approvalId: req.params.id });

        let execution = null;

        if (ctx.type === "market-opportunity") {
            const p = ctx.prospect || {};
            const name = p.name || "";
            if (name && name !== "Unknown" && name !== "N/A") {
                const enriched = await enrichProspect({
                    name, website: p.sourceUrl || p.website || "",
                    email: p.email || "", phone: p.phone || "",
                    city: p.city || "", state: p.state || ""
                });
                const edata = enriched.data || {};
                execution = {
                    type: "market-opportunity",
                    enrichment: {
                        email: edata.email || null,
                        phone: edata.phone || null,
                        executiveName: edata.executiveName || null
                    },
                    note: "Prospect enriched. Connect your CRM to auto-add contacts."
                };
            } else {
                execution = { type: "market-opportunity", status: "approved-no-action", note: "No valid company name" };
            }
        } else {
            execution = { note: "Approval recorded. Action: " + (fullApproval?.action || "unknown") };
        }

        res.json({ ok: true, data: approval, execution });
    } catch (error) {
        res.status(error.statusCode || 400).json({ ok: false, error: error.message });
    }
});

router.post("/deny/:id", ...requireRole("owner"), (req, res) => {
    try {
        const approval = approvals.deny(req.params.id, {
            deniedBy: req.auth.name,
            reason: req.body?.reason,
            requestId: req.id
        });
        audit.append("today_actions_denied", { actor: req.auth.name, requestId: req.id, approvalId: req.params.id });
        res.json({ ok: true, data: approval });
    } catch (error) {
        res.status(error.statusCode || 400).json({ ok: false, error: error.message });
    }
});

router.post("/enrich/:id", ...requireRole("owner"), async (req, res) => {
    try {
        let fullApproval;
        try { fullApproval = approvals.getApproval(req.params.id); } catch (_e) { fullApproval = null; }
        if (!fullApproval || fullApproval.status !== "pending") {
            return res.status(404).json({ ok: false, error: "Approval not found or not pending" });
        }
        const ctx = fullApproval.context || {};
        const p = ctx.prospect || {};
        const name = p.name || "";
        if (!name || name === "Unknown" || name === "N/A") {
            return res.status(400).json({ ok: false, error: "No company name to enrich" });
        }

        const enriched = await enrichProspect({
            name, website: p.sourceUrl || p.website || "",
            email: p.email || "", phone: p.phone || "",
            city: p.city || "", state: p.state || ""
        });
        const edata = enriched.data || {};

        approvals.approve(req.params.id, {
            confirmation: "APPROVE",
            approvedBy: req.auth.name,
            requestId: req.id
        });
        audit.append("today_actions_enriched_approved", {
            actor: req.auth.name, requestId: req.id,
            approvalId: req.params.id, emailFound: !!edata.email
        });

        res.json({
            ok: true,
            data: {
                enrichment: {
                    email: edata.email || null,
                    phone: edata.phone || null,
                    executiveName: edata.executiveName || null,
                    executiveTitle: edata.executiveTitle || null,
                    sources: edata.sources || []
                },
                note: "Prospect enriched. Connect your CRM to auto-add contacts."
            }
        });
    } catch (error) {
        res.status(error.statusCode || 500).json({ ok: false, error: error.message });
    }
});

module.exports = router;
