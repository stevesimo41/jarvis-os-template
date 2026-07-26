const express = require("express");
const { requireRole } = require("../auth/localAuth");
const webResearch = require("../services/webResearch");
const audit = require("../governance/auditLog");

const router = express.Router();

router.post("/research", ...requireRole("operator"), async (req, res) => {
    const { name, website } = req.body || {};
    if (!name) return res.status(400).json({ ok: false, error: "name is required" });
    try {
        const findings = await webResearch.researchOrganization(name, website);
        audit.append("web_research", { actor: req.auth.name, requestId: req.id, organization: name });
        return res.json({ ok: true, data: findings });
    } catch (error) {
        return res.status(400).json({ ok: false, error: error.message });
    }
});

router.post("/discover", ...requireRole("operator"), async (req, res) => {
    const { query, location, limit } = req.body || {};
    if (!query) return res.status(400).json({ ok: false, error: "query is required" });
    try {
        const results = await webResearch.discoverProspects(query, location, limit);
        audit.append("web_discovery", { actor: req.auth.name, requestId: req.id, query });
        return res.json({ ok: true, data: results });
    } catch (error) {
        return res.status(400).json({ ok: false, error: error.message });
    }
});

module.exports = router;
