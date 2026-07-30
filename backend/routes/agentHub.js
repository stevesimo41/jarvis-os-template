const express = require("express");
const { requireRole } = require("../auth/localAuth");
const review = require("../services/agentReviewService");
const approvals = require("../governance/approvalService");
const audit = require("../governance/auditLog");
const { enrichProspect } = require("../services/prospectEnrichmentService");
const { readJson, writeJsonAtomic } = require("../storage/atomicJsonStore");
const path = require("path");
const router = express.Router();

function crmDataPath() { return path.join(__dirname, "../data/crm/contacts.json"); }

async function saveToLocalCrm(prospect) {
    const contacts = readJson(crmDataPath(), []);
    contacts.push({ ...prospect, addedAt: new Date().toISOString() });
    writeJsonAtomic(crmDataPath(), contacts);
}

router.get("/", async (_req, res) => {
    try {
        const data = await review.inbox();
        res.json({ ok: true, data });
    } catch (error) {
        console.error("Agent hub inbox error:", error.message);
        res.status(500).json({ ok: false, error: error.message });
    }
});

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
            const name = p.name || "";
            if (!name || name === "Unknown" || name === "N/A") {
                execution = { crm: false, skipped: true, reason: "placeholder name" };
            } else {
                const enriched = await enrichProspect({ name, website: p.sourceUrl || p.website || "", email: p.email || "", phone: p.phone || "", city: p.city || "Your City", state: p.state || "Your State" });
                const edata = enriched.data || {};
                const email = edata.email || p.email || "";
                try {
                    await saveToLocalCrm({ name, source: "market-pulse", city: edata.city || p.city || "Your City", state: p.state || "Your State", category: p.category || "", fitScore: p.fitScore || 0, enrichment: edata });
                    execution = { crm: true, crmCount: 1 };
                } catch (crmErr) {
                    execution = { crm: false, error: crmErr.message };
                }
                execution.enrichment = { email: email || null, phone: edata.phone || null, executiveName: edata.executiveName || null };
            }
        } else if (action === "add_prospects_to_crm" && ctx.prospect) {
            try {
                const p = ctx.prospect;
                const name = p.name || p.companyName || "";
                if (!name || name === "Unknown" || name === "N/A") {
                    execution = { crm: false, skipped: true, reason: "placeholder name" };
                } else {
                    const enriched = await enrichProspect({ name, website: p.sourceUrl || p.website || "", email: p.email || "", phone: p.phone || "", city: p.city || "Your City", state: p.state || "Your State", executiveName: p.executiveName || "" });
                    const edata = enriched.data || {};
                    const email = edata.email || p.email || p.executiveEmail || p.contactEmail || "";
                    const companyName = edata.name || name;
                    try {
                        await saveToLocalCrm({ name: companyName, source: p.source || "agent-discovery", city: edata.city || p.city || "Your City", state: p.state || "Your State", category: p.category || "", fitScore: p.fitScore || 0, snippet: p.snippet || "", enrichment: edata });
                        execution = { crm: true, crmCount: 1 };
                    } catch (crmErr) {
                        execution = { crm: false, error: crmErr.message };
                        return res.json({ ok: true, data: approval, execution });
                    }
                    execution.enrichment = { email: email || null, phone: edata.phone || null, executiveName: edata.executiveName || null };
                }
            } catch (err) {
                execution = { crm: false, error: err.message };
            }
        } else if (action === "enrich_crm_prospect" && ctx.prospect) {
            execution = { enriched: true, note: "Enrichment queued for next agent run" };
        } else {
            execution = { note: "approval recorded, no auto-execution for action type: " + action };
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
        const name = p.name || "";
        if (!name || name === "Unknown" || name === "N/A") {
            return res.status(400).json({ ok: false, error: "No company name to enrich" });
        }

        const enriched = await enrichProspect({ name, website: p.sourceUrl || p.website || "", email: p.email || "", phone: p.phone || "", city: p.city || "Your City", state: p.state || "Your State" });
        const edata = enriched.data || {};
        const email = edata.email || p.email || "";
        const phone = edata.phone || p.phone || "";
        const execName = edata.executiveName || p.executiveName || "";
        const companyName = edata.name || name;

        let crmResult = null;
        try {
            await saveToLocalCrm({ name: companyName, source: "market-pulse", city: edata.city || p.city || "Your City", state: p.state || "Your State", category: p.category || "", fitScore: p.fitScore || 0, enrichment: edata });
            crmResult = { added: true };
        } catch (crmErr) {
            crmResult = { added: false, error: crmErr.message };
        }

        approvals.approve(req.params.approvalId, { confirmation: "APPROVE", approvedBy: req.auth.name, requestId: req.id });
        audit.append("agent_hub_mpo_enriched_approved", { actor: req.auth.name, requestId: req.id, approvalId: req.params.approvalId, emailFound: !!email });

        res.json({
            ok: true,
            data: {
                enrichment: { email: email || null, phone: phone || null, executiveName: execName || null, executiveTitle: edata.executiveTitle || null, sources: edata.sources || [] },
                crm: crmResult
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
