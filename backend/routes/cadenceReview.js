const express = require("express");
const router = express.Router();
const cleansing = require("../services/dataCleansingService");
const fs = require("fs");
const path = require("path");

const ENRICHMENT_PATH = path.join(__dirname, "../data/agents/enrichment-suggestions.json");

function readJson(filePath, fallback) {
    try { return JSON.parse(fs.readFileSync(filePath, "utf8")); } catch (_e) { return fallback; }
}

function writeJson(filePath, data) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

router.get("/tasks", async (req, res) => {
    try {
        const { status, priority, cadenceType } = req.query;
        const result = cleansing.getTasks({ status, priority, cadenceType });
        res.json({ ok: true, data: result });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

router.post("/tasks/:taskId/complete", async (req, res) => {
    try {
        const { taskId } = req.params;
        const { action } = req.body;
        
        if (!action || !["approved", "skipped", "edited"].includes(action)) {
            return res.status(400).json({ ok: false, error: "Action must be 'approved', 'skipped', or 'edited'" });
        }
        
        const task = cleansing.completeTask(taskId, action);
        if (!task) {
            return res.status(404).json({ ok: false, error: "Task not found" });
        }
        
        res.json({ ok: true, data: task });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

router.post("/cleanse", async (req, res) => {
    try {
        const result = await cleansing.cleanseCadences();
        res.json({ ok: true, data: result });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

router.post("/tasks/create", async (req, res) => {
    try {
        const result = cleansing.createReviewTasks();
        res.json({ ok: true, data: result });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

// Get full campaign details for preview
router.get("/campaign/:campaignId", async (req, res) => {
    try {
        const CAMPAIGNS_PATH = path.join(__dirname, "../data/agents/well-noticed-campaigns.json");
        const state = readJson(CAMPAIGNS_PATH, { campaigns: [] });
        const campaign = state.campaigns.find(c => c.id === req.params.campaignId);
        if (!campaign) return res.status(404).json({ ok: false, error: "Campaign not found" });
        res.json({ ok: true, data: campaign });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

// Enrichment suggestions
router.get("/enrichment", async (req, res) => {
    try {
        const data = readJson(ENRICHMENT_PATH, { suggestions: [], summary: {} });
        res.json({ ok: true, data });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

router.post("/enrichment/run", async (req, res) => {
    try {
        const result = await cleansing.enrichMissingNames();
        res.json({ ok: true, data: result });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

router.post("/enrichment/apply", async (req, res) => {
    try {
        const { campaignId, name, email } = req.body;
        if (!campaignId) return res.status(400).json({ ok: false, error: "campaignId required" });

        const CAMPAIGNS_PATH = path.join(__dirname, "../data/agents/well-noticed-campaigns.json");
        const state = readJson(CAMPAIGNS_PATH, { campaigns: [] });
        const campaign = state.campaigns.find(c => c.id === campaignId);
        if (!campaign) return res.status(404).json({ ok: false, error: "Campaign not found" });

        const changes = [];
        if (name && name !== campaign.executiveName) {
            campaign.executiveName = name;
            changes.push({ field: "executiveName", value: name });
        }
        if (email && email !== campaign.executiveEmail) {
            campaign.executiveEmail = email;
            changes.push({ field: "executiveEmail", value: email });
        }

        if (changes.length > 0) {
            writeJson(CAMPAIGNS_PATH, state);

            // Update the enrichment suggestion status
            const enrichData = readJson(ENRICHMENT_PATH, { suggestions: [] });
            const suggestion = enrichData.suggestions.find(s => s.campaignId === campaignId);
            if (suggestion) {
                suggestion.applied = true;
                suggestion.appliedAt = new Date().toISOString();
                writeJson(ENRICHMENT_PATH, enrichData);
            }
        }

        res.json({ ok: true, data: { campaignId, changes, executiveName: campaign.executiveName, executiveEmail: campaign.executiveEmail } });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

module.exports = router;
