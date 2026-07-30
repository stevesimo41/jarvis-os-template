const express = require("express");
const router = express.Router();
const ci = require("../services/competitiveIntelService");

router.get("/landscape", (req, res) => {
    try {
        const landscape = ci.getLandscape();
        res.json({ ok: true, data: landscape });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

router.get("/category/:category", (req, res) => {
    try {
        const result = ci.getCategoryCompetitors(req.params.category);
        res.json({ ok: true, data: result });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

router.get("/stats", (req, res) => {
    try {
        const stats = ci.getStats();
        res.json({ ok: true, data: stats });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

module.exports = router;
