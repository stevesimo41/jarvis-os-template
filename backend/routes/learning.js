const express = require("express");
const router = express.Router();
const learningEngine = require("../services/learningEngine");

router.get("/insights", (req, res) => {
    try {
        const insights = learningEngine.getInsights();
        res.json({ ok: true, data: insights });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

router.get("/outcomes", (req, res) => {
    try {
        const outcomes = learningEngine.getOutcomes();
        res.json({ ok: true, data: outcomes });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

router.get("/outcomes/:sentiment", (req, res) => {
    try {
        const outcomes = learningEngine.getOutcomes();
        const filtered = (outcomes.outcomes || []).filter(o => o.sentiment === req.params.sentiment);
        res.json({ ok: true, data: { outcomes: filtered, outcomesPatterns: outcomes.outcomesPatterns } });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

router.get("/stats", (req, res) => {
    try {
        const stats = learningEngine.getStats();
        res.json({ ok: true, data: stats });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

router.get("/adjustments", (req, res) => {
    try {
        const adj = learningEngine.getAdjustments();
        res.json({ ok: true, data: adj });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

module.exports = router;
