const express = require("express");
const service = require("../services/systemInventoryService");
const router = express.Router();

router.get("/", (_req, res) => res.json({ ok: true, data: service.inventory() }));

module.exports = router;
