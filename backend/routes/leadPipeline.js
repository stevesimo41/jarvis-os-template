const express = require("express");
const router = express.Router();
const leadPipeline = require("../services/leadPipelineService");
const { ok, fail } = require("../http/apiResponse");

router.get("/status", async (req, res) => {
    try {
        const status = leadPipeline.getPipelineStatus();
        res.json(ok(status));
    } catch (err) {
        res.status(500).json(fail(err.message));
    }
});

router.get("/preview", async (req, res) => {
    try {
        const prospects = await leadPipeline.readProspectsFromSheet();
        const candidates = prospects.filter(p =>
            p.touchStatus.includes("Not Touched") &&
            p.email &&
            p.email.includes("@") &&
            p.companyName &&
            p.companyName !== "N/A" &&
            p.companyName !== "Unknown"
        );

        const scored = candidates.map(p => ({
            companyName: p.companyName,
            email: p.email,
            phone: p.phone,
            category: p.masterCategory,
            subCategory: p.subCategory,
            city: p.city,
            website: p.website,
            contact: p.mainContact,
            ...leadPipeline.scoreProspect(p)
        }));

        scored.sort((a, b) => b.score - a.score);

        res.json(ok({
            totalProspects: prospects.length,
            candidatesFound: candidates.length,
            qualified: scored.filter(s => s.score >= 20).length,
            highPriority: scored.filter(s => s.recommendation === "high-priority").length,
            mediumPriority: scored.filter(s => s.recommendation === "medium-priority").length,
            prospects: scored
        }));
    } catch (err) {
        res.status(500).json(fail(err.message));
    }
});

router.post("/run", async (req, res) => {
    try {
        const { dryRun = false, maxCadences = 50, minScore = 20 } = req.body || {};
        const result = await leadPipeline.runPipeline({ dryRun, maxCadences, minScore });
        res.json(ok(result));
    } catch (err) {
        res.status(500).json(fail(err.message));
    }
});

module.exports = router;
