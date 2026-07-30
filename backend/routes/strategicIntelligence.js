const express = require("express");
const router = express.Router();
const strategicIntel = require("../services/strategicIntelligenceService");

router.get("/", (req, res) => {
    try {
        const insights = strategicIntel.getLatestInsights();
        res.json(insights);
    } catch (error) {
        console.error("Strategic intel GET error:", error);
        res.status(500).json({
            status: "error",
            message: error.message
        });
    }
});

router.post("/scan", async (req, res) => {
    try {
        const result = await strategicIntel.runIntelligenceScan();
        res.json({
            status: "completed",
            insights: result.insights,
            lastRun: result.lastRun,
            total: result.insights.length
        });
    } catch (error) {
        console.error("Strategic intel scan error:", error);
        res.status(500).json({
            status: "error",
            message: error.message
        });
    }
});

module.exports = router;
