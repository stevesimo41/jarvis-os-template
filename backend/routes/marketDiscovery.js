const express = require("express");
const { requireRole } = require("../auth/localAuth");
const discovery = require("../agents/marketDiscoveryAgent");
const audit = require("../governance/auditLog");

const router = express.Router();

router.get("/status", (_req, res) => {
    res.json({ ok: true, data: discovery.getStatus() });
});

router.post("/runs", ...requireRole("operator"), async (req, res) => {
    const ventureId = req.body?.ventureId || "well-noticed";
    try {
        const run = await discovery.runDiscovery(ventureId, { maxPerQuery: req.body?.maxPerQuery || 5 });
        audit.append("market_discovery_run", { actor: req.auth.name, requestId: req.id, ventureId, newProspects: run.newProspects });
        return res.json({ ok: true, data: run });
    } catch (error) {
        return res.status(400).json({ ok: false, error: error.message });
    }
});

module.exports = router;
