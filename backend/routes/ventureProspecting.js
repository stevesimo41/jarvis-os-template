const express = require("express");
const { requireRole } = require("../auth/localAuth");
const ventureProspecting = require("../services/ventureProspectingService");
const audit = require("../governance/auditLog");

const router = express.Router();

router.get("/status", (req, res) => {
    res.json({ ok: true, data: ventureProspecting.status() });
});

router.post("/run", ...requireRole("operator"), async (req, res) => {
    try {
        const actor = req.user?.id || req.headers["x-actor-id"] || "operator";
        const serviceId = req.body?.serviceId || null;
        const result = await ventureProspecting.runProspecting({ actor, serviceId });
        audit.append("venture_prospecting_run", { actor, requestId: req.id, qualified: result.qualified });
        return res.json({ ok: true, data: result });
    } catch (error) {
        return res.status(500).json({ ok: false, error: error.message });
    }
});

router.post("/draft/:prospectId", ...requireRole("operator"), (req, res) => {
    try {
        const draft = ventureProspecting.generateDraft(req.params.prospectId, req.body?.contactName);
        return res.json({ ok: true, data: draft });
    } catch (error) {
        return res.status(error.statusCode || 400).json({ ok: false, error: error.message });
    }
});

router.post("/draft/:draftId/approve", ...requireRole("owner"), (req, res) => {
    try {
        const draft = ventureProspecting.approveDraft(req.params.draftId, req.auth?.name || "owner");
        audit.append("venture_outreach_approved", { actor: req.auth?.name, requestId: req.id, draftId: req.params.draftId });
        return res.json({ ok: true, data: draft });
    } catch (error) {
        return res.status(error.statusCode || 400).json({ ok: false, error: error.message });
    }
});

router.post("/draft/:draftId/send", ...requireRole("owner"), async (req, res) => {
    try {
        const draft = await ventureProspecting.sendDraft(req.params.draftId, req.auth?.name || "owner");
        audit.append("venture_outreach_sent", { actor: req.auth?.name, requestId: req.id, draftId: req.params.draftId, prospect: draft.prospectName });
        return res.json({ ok: true, data: draft });
    } catch (error) {
        return res.status(error.statusCode || 400).json({ ok: false, error: error.message });
    }
});

module.exports = router;
