const express = require("express");
const { requireRole } = require("../auth/localAuth");
const control = require("../services/systemControlService");
const audit = require("../governance/auditLog");
const router = express.Router();
router.get("/status", (_req, res) => res.json({ ok: true, data: control.status() }));
router.post("/stop", ...requireRole("owner"), (req, res) => {
    if (req.body?.confirmation !== "STOP") return res.status(400).json({ ok: false, error: "confirmation must exactly equal STOP" });
    const state = control.stop(req.auth.name, req.body.reason); audit.append("emergency_stop_activated", { actor: req.auth.name, requestId: req.id }); return res.json({ ok: true, data: state });
});
router.post("/resume", ...requireRole("owner"), (req, res) => {
    if (req.body?.confirmation !== "RESUME") return res.status(400).json({ ok: false, error: "confirmation must exactly equal RESUME" });
    const state = control.resume(req.auth.name); audit.append("emergency_stop_released", { actor: req.auth.name, requestId: req.id }); return res.json({ ok: true, data: state });
});
module.exports = router;
