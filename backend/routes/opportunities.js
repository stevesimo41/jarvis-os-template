const express = require("express");
const engine = require("../opportunities/opportunityEngine");
const router = express.Router();

router.get("/inbox", (req, res) => res.json({ ok: true, data: { opportunities: engine.inbox(req.query), stages: engine.stages, dimensions: engine.dimensions } }));
router.get("/weekly-review", (_req, res) => res.json({ ok: true, data: engine.weeklyReview() }));
router.get("/:id", (req, res) => {
    const opportunity = engine.inbox().find(item => item.id === req.params.id);
    if (!opportunity) return res.status(404).json({ ok: false, error: "Opportunity not found" });
    return res.json({ ok: true, data: opportunity });
});

module.exports = router;
