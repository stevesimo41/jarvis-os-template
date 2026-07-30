const express = require("express");
const router = express.Router();
const tracking = require("../services/emailTrackingService");

// 1x1 transparent GIF tracking pixel for email opens
router.get("/open/:trackingId", (req, res) => {
    const { trackingId } = req.params;
    tracking.recordEvent(trackingId, "open", {
        ip: req.ip || req.connection?.remoteAddress,
        userAgent: req.headers["user-agent"]
    });
    res.set("Content-Type", "image/gif");
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");
    res.send(tracking.getTrackingPixel());
});

// Click-through redirect
router.get("/click/:trackingId", (req, res) => {
    const { trackingId } = req.params;
    const url = req.query.url;
    if (!url) return res.status(400).send("Missing url parameter");
    tracking.recordEvent(trackingId, "click", {
        url,
        ip: req.ip || req.connection?.remoteAddress,
        userAgent: req.headers["user-agent"]
    });
    // Follow redirect to actual URL
    res.redirect(302, url);
});

// Stats API (for dashboard)
router.get("/stats", (req, res) => {
    const stats = tracking.getTrackingStats();
    res.json({ ok: true, data: stats });
});

// Recent events
router.get("/events", (req, res) => {
    const limit = parseInt(req.query.limit) || 50;
    const events = tracking.getRecentEvents(limit);
    res.json({ ok: true, data: { events, count: events.length } });
});

// Tracking info for a specific campaign
router.get("/campaign/:campaignId", (req, res) => {
    const info = tracking.getTrackingByCampaign(req.params.campaignId);
    res.json({ ok: true, data: { mappings: info, count: info.length } });
});

module.exports = router;
