const express = require("express");
const { requireRole } = require("../auth/localAuth");
const readiness = require("../readiness/readinessService");
const pilot = require("../pilots/wellNoticedRenewalPilot");
const audit = require("../governance/auditLog");

const router = express.Router();
router.get("/status", (_req, res) => res.json({ ok: true, data: readiness.assessment() }));
router.get("/revenue-pilot", (_req, res) => res.json({ ok: true, data: pilot.status() }));
router.post("/revenue-pilot/run", ...requireRole("operator"), (req, res) => {
    if (req.body?.confirmation !== "RUN SHADOW") {
        return res.status(400).json({ ok: false, error: "confirmation must exactly equal RUN SHADOW" });
    }
    const result = pilot.run(req.auth.name);
    audit.append("revenue_pilot_shadow_run", {
        actor: req.auth.name,
        requestId: req.id,
        outcome: result.outcome,
        ventureId: "well-noticed"
    });
    return res.json({ ok: true, data: result });
});
module.exports = router;
