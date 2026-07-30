const express = require("express");
const executive = require("../services/canonicalExecutiveService");
const operations = require("../agents/chiefOfStaffOperationsService");
const communication = require("../services/agentCommunicationService");
const { requireRole } = require("../auth/localAuth");
const audit = require("../governance/auditLog");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const state = executive.state();
    const oversight = await operations.status();

    res.json({
      agent: "Chief of Staff",
      status: "operational",
      version: oversight.agent.version,
      owner: process.env.JARVIS_OWNER_NAME || "Owner",
      role: "Owner",
      activeVentures: state.ventures,
      priorities: state.goals.map(goal => ({ name: goal.name, focus: goal.nextMilestone || "No milestone recorded" })),
      recentDecisions: [],
      oversight,
      message: "Chief of Staff connected to canonical local context; external synchronization is off.",
      provenance: { source: state.source, externalSynchronization: false }
    });
  } catch (error) {
    console.error("Chief of Staff error:", error.message);
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.get("/operations", async (_req, res) => {
  try {
    res.json({ ok: true, data: await operations.status() });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});
router.post("/operations/runs", ...requireRole("operator"), async (req, res) => {
  if (req.body?.confirmation !== "RUN STAFF REVIEW") return res.status(400).json({ ok: false, error: "confirmation must exactly equal RUN STAFF REVIEW" });
  try { const run = await operations.run(req.auth.name); audit.append("chief_of_staff_review_run", { actor: req.auth.name, requestId: req.id, traceId: run.traceId, agentsReviewed: run.agentsReviewed }); return res.json({ ok: true, data: run }); }
  catch (error) { return res.status(409).json({ ok: false, error: error.message }); }
});

router.get("/communication", async (_req, res) => {
  try {
    res.json({ ok: true, data: communication.status() });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.post("/communication/share", ...requireRole("operator"), async (req, res) => {
  try {
    const { from, to, topic, message, context } = req.body;
    if (!from || !topic || !message) return res.status(400).json({ ok: false, error: "from, topic, and message are required" });
    const share = communication.shareContext(from, to || "all", topic, message, context);
    res.json({ ok: true, data: share });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

module.exports = router;
