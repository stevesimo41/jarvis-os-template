const express = require("express");
const executive = require("../services/canonicalExecutiveService");
const router = express.Router();
router.get("/", (_req, res) => res.json({ ok: true, data: executive.state() }));
module.exports = router;
