const express = require("express");
const context = require("../brain/canonicalContextService");
const activity = require("../brain/activityService");

const router = express.Router();

router.get("/context", (req, res) => {
    res.json({ ok: true, data: context.assemble({ include: req.query.include }) });
});

router.get("/schema", (_req, res) => {
    res.json({ ok: true, data: context.schema() });
});

router.get("/activity", (req, res) => {
    const events = activity.list(req.query.limit);
    res.json({
        ok: true,
        data: { events, count: events.length, phases: ["observed", "recommended", "prepared", "requested", "executed", "learned"] }
    });
});

module.exports = router;
