const express = require("express");
const { requireRole } = require("../auth/localAuth");
const agents = require("../agents/productionAgentService");
const audit = require("../governance/auditLog");
const router = express.Router();

router.get("/status", (_req, res) => res.json({ ok: true, data: agents.status() }));
router.post("/schedules/:scheduleId", ...requireRole("owner"), (req, res) => {
    const expected = req.body?.enabled ? "ENABLE SCHEDULE" : "DISABLE SCHEDULE";
    if (req.body?.confirmation !== expected) return res.status(400).json({ ok: false, error: `confirmation must exactly equal ${expected}` });
    try {
        const schedule = agents.setSchedule(req.params.scheduleId, req.body.enabled, req.auth.name);
        audit.append("production_agent_schedule_changed", { actor: req.auth.name, requestId: req.id, scheduleId: schedule.id, enabled: schedule.enabled });
        return res.json({ ok: true, data: schedule });
    } catch (error) { return res.status(404).json({ ok: false, error: error.message }); }
});
router.post("/runs", ...requireRole("operator"), (req, res) => {
    if (req.body?.confirmation !== "RUN SUPERVISED") return res.status(400).json({ ok: false, error: "confirmation must exactly equal RUN SUPERVISED" });
    try {
        const run = agents.runSupervised(req.body, req.auth.name);
        audit.append("production_agent_supervised_run", { actor: req.auth.name, requestId: req.id, agentId: run.agentId, traceId: run.traceId, outcome: run.outcome });
        return res.json({ ok: true, data: run });
    } catch (error) { return res.status(409).json({ ok: false, error: error.message }); }
});

module.exports = router;
