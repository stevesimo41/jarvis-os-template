const express = require("express");
const router = express.Router();
const dailyPriorities = require("../services/dailyPrioritiesService");

router.get("/", (req, res) => {
    try {
        const priorities = dailyPriorities.generateDailyPriorities();
        res.json({ status: "online", priorities });
    } catch (error) {
        console.error("Daily priorities GET error:", error);
        res.status(500).json({ status: "error", message: error.message });
    }
});

router.post("/approve", (req, res) => {
    try {
        const { date, priorities, userOrder, adjustments } = req.body;
        if (!date || !userOrder) {
            return res.status(400).json({ status: "error", message: "date and userOrder are required" });
        }
        const result = dailyPriorities.recordApproval(date, priorities || [], userOrder, adjustments || []);
        res.json({ status: "approved", result });
    } catch (error) {
        console.error("Daily priorities approve error:", error);
        res.status(500).json({ status: "error", message: error.message });
    }
});

router.get("/preferences", (req, res) => {
    try {
        const prefs = dailyPriorities.getUserPreferences();
        res.json({ status: "online", preferences: prefs });
    } catch (error) {
        console.error("Daily preferences GET error:", error);
        res.status(500).json({ status: "error", message: error.message });
    }
});

module.exports = router;
