const express = require("express");
const { requireRole } = require("../auth/localAuth");
const scheduler = require("../agents/agentSchedulerService");
const audit = require("../governance/auditLog");

const router = express.Router();

router.get("/status", (_req, res) => {
    res.json({ ok: true, data: scheduler.status() });
});

router.get("/schedules", (_req, res) => {
    res.json({ ok: true, data: scheduler.getSchedules() });
});

router.post("/schedules/:scheduleId/toggle", ...requireRole("operator"), (req, res) => {
    const enabled = req.body?.enabled;
    if (typeof enabled !== "boolean") {
        return res.status(400).json({ ok: false, error: "enabled must be a boolean" });
    }
    try {
        const schedule = scheduler.toggleSchedule(req.params.scheduleId, enabled, req.auth.name);
        audit.append("schedule_toggled", { actor: req.auth.name, requestId: req.id, scheduleId: req.params.scheduleId, enabled });
        return res.json({ ok: true, data: schedule });
    } catch (error) {
        return res.status(error.statusCode || 400).json({ ok: false, error: error.message });
    }
});

router.post("/schedules/:scheduleId/run", ...requireRole("operator"), async (req, res) => {
    try {
        const run = await scheduler.runSchedule(req.params.scheduleId, req.auth.name);
        audit.append("scheduler_run", { actor: req.auth.name, requestId: req.id, scheduleId: req.params.scheduleId, findingsCount: run.findingsCount });
        return res.json({ ok: true, data: run });
    } catch (error) {
        return res.status(error.statusCode || 400).json({ ok: false, error: error.message });
    }
});

router.get("/runs", (req, res) => {
    res.json({ ok: true, data: scheduler.getRecentRuns(req.query.limit) });
});

router.get("/findings", (req, res) => {
    res.json({ ok: true, data: scheduler.getFindings({
        ventureId: req.query.ventureId,
        fitGrade: req.query.fitGrade,
        limit: req.query.limit
    }) });
});

module.exports = router;
