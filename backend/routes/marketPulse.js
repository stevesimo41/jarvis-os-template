const express = require("express");
const { requireRole } = require("../auth/localAuth");
const marketPulse = require("../agents/marketPulseAgent");
const audit = require("../governance/auditLog");
const router = express.Router();

router.get("/", ...requireRole("viewer"), (_req, res) => {
    try {
        res.json({ ok: true, data: marketPulse.status() });
    } catch (error) { res.status(500).json({ ok: false, error: error.message }); }
});

router.get("/findings", ...requireRole("viewer"), (req, res) => {
    try {
        const findings = marketPulse.getFindings({
            category: req.query.category,
            minScore: req.query.minScore ? Number(req.query.minScore) : undefined,
            limit: req.query.limit ? Number(req.query.limit) : undefined
        });
        res.json({ ok: true, data: { findings, total: findings.length } });
    } catch (error) { res.status(500).json({ ok: false, error: error.message }); }
});

router.post("/scan", ...requireRole("owner"), async (req, res) => {
    try {
        const result = await marketPulse.runMarketPulseWithPipeline(req.auth.name);
        audit.append("market_pulse_scan", { actor: req.auth.name, requestId: req.id, newFound: result.newFound, pipelineCreated: result.pipeline?.created?.length || 0 });
        res.json({ ok: true, data: result });
    } catch (error) { res.status(500).json({ ok: false, error: error.message }); }
});

module.exports = router;
