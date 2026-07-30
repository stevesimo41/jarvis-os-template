const express = require("express");
const { requireRole } = require("../auth/localAuth");
const service = require("../agents/opportunityPilotService");
const audit = require("../governance/auditLog");
const router = express.Router();
router.get("/status", async (_req, res) => {
    try {
        res.json({ ok: true, data: await service.status() });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
});
router.post("/runs", ...requireRole("operator"), async (req, res) => {
    if (req.body?.confirmation !== "RUN OPPORTUNITY REVIEW") return res.status(400).json({ ok: false, error: "confirmation must exactly equal RUN OPPORTUNITY REVIEW" });
    try { const run = await service.run(req.auth.name); audit.append("opportunity_agent_supervised_run", { actor: req.auth.name, requestId: req.id, traceId: run.traceId, outcome: run.outcome }); return res.json({ ok: true, data: run }); }
    catch (error) { return res.status(409).json({ ok: false, error: error.message }); }
});
module.exports = router;
