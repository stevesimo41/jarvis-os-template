const express = require("express");
const { requireRole } = require("../auth/localAuth");
const conversation = require("../services/conversationalJarvisService");
const control = require("../services/systemControlService");
const activity = require("../brain/activityService");
const opportunities = require("../opportunities/opportunityEngine");
const router = express.Router();

router.get("/capabilities", (_req, res) => res.json({ ok: true, data: {
    webVoice: { recognition: "browser-dependent", synthesis: "browser-dependent" },
    shortcuts: ["ask", "daily-brief", "capture-idea", "review-approvals", "stop-automation"],
    nativeBridge: "contract-ready", authenticationBypass: false, approvalBypass: false
} }));
router.post("/shortcuts/ask", ...requireRole("viewer"), async (req, res) => {
    try { const result = await conversation.respond([{ role: "user", content: req.body?.prompt }]); res.json({ ok: true, data: result }); }
    catch (error) { res.status(error.status || 400).json({ ok: false, error: error.message }); }
});
router.get("/shortcuts/daily-brief", ...requireRole("viewer"), (_req, res) => {
    const review = opportunities.weeklyReview();
    res.json({ ok: true, data: { headline: `${review.metrics.qualified} qualified opportunities`, opportunityMetrics: review.metrics, systemControl: control.status() } });
});
router.post("/shortcuts/capture-idea", ...requireRole("viewer"), (req, res) => {
    const idea = String(req.body?.idea || "").trim().slice(0, 1000);
    if (!idea) return res.status(400).json({ ok: false, error: "idea is required" });
    activity.append("prepared", "Idea captured for review without persistence", { source: "apple-shortcut" });
    return res.json({ ok: true, data: { idea, status: "prepared", persisted: false, approvalRequiredToPersist: true } });
});
router.post("/shortcuts/stop-automation", ...requireRole("owner"), (req, res) => {
    if (req.body?.confirmation !== "STOP") return res.status(400).json({ ok: false, error: "confirmation must exactly equal STOP" });
    res.json({ ok: true, data: control.stop(req.auth.name, "Apple Shortcut emergency stop") });
});
router.get("/widget", ...requireRole("viewer"), (_req, res) => {
    const review = opportunities.weeklyReview();
    res.json({ ok: true, data: { qualifiedOpportunities: review.metrics.qualified, projectedValue: review.metrics.projectedValue, stopped: control.status().stopped, refreshedAt: new Date().toISOString() } });
});
module.exports = router;
