const express = require("express");
const router = express.Router();
router.get("/", (_req, res) => res.json({ ok: true, data: [] }));
router.get("/status", (_req, res) => res.json({ status: "stub" }));
module.exports = router;
