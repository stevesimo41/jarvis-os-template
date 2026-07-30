const express = require("express");
const fs = require("fs");
const path = require("path");

const router = express.Router();
const releasesPath = path.resolve(__dirname, "../data/releases.json");

router.get("/", (_req, res) => {
    try {
        const data = JSON.parse(fs.readFileSync(releasesPath, "utf8"));
        res.json({ ok: true, data });
    } catch (error) {
        res.status(500).json({
            ok: false,
            error: "Release metadata is unavailable."
        });
    }
});

module.exports = router;
