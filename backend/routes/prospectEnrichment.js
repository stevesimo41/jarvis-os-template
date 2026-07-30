const express = require("express");
const { enrichProspect } = require("../services/prospectEnrichmentService");

const router = express.Router();

router.post("/", async (req, res) => {
    try {
        const result = await enrichProspect(req.body);
        res.json({ ok: true, data: result.data || {}, enriched: result.enriched, reason: result.reason });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
});

module.exports = router;
