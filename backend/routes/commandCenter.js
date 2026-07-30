const express = require("express");
const router = express.Router();

const health = require("../services/health/healthCheck");
const projects = require("../services/avoProjectService");
const tracking = require("../services/emailTrackingService");

router.get("/", (req, res) => {
    try {
        const projectStats = projects.getProjectStats();
        const trackingStats = tracking.getTrackingStats();
        res.json({
            status: "online",
            system: "JARVIS OS",
            health: health.runHealthCheck(),
            projects: projectStats,
            emailTracking: trackingStats,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error("Command Center error:", error);

        res.status(500).json({
            status: "error",
            message: error.message
        });
    }
});

module.exports = router;
