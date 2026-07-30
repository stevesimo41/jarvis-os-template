const express = require("express");
const service = require("../services/mobileAccessReadinessService");
const router = express.Router();
router.get("/readiness", (_req, res) => res.json({ ok: true, data: service.status() }));
module.exports = router;
