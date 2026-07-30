const express = require("express");
const router = express.Router();
router.get("/status", (_req, res) => res.json({ status: "stub", prospects: 0 }));
router.get("/prospects", (_req, res) => res.json({ prospects: [], counts: {} }));
router.get("/campaigns", (_req, res) => res.json({ campaigns: [] }));
module.exports = router;
