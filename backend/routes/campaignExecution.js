const express = require("express");
const router = express.Router();
const executionService = require("../services/campaignExecutionService");

router.get("/active", (req, res) => {
    try {
        const campaigns = executionService.listActiveCampaigns();
        res.json({ ok: true, data: { campaigns, count: campaigns.length } });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

router.get("/by-company/:companyName", (req, res) => {
    try {
        const { companyName } = req.params;
        const fs = require("fs");
        const path = require("path");
        const STATE_PATH = path.join(__dirname, "../data/agents/well-noticed-campaigns.json");
        const state = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
        const match = state.campaigns.find(c => (c.prospectName || "").toLowerCase() === companyName.toLowerCase());
        if (!match) return res.json({ ok: true, data: null });
        res.json({ ok: true, data: match });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

router.put("/:campaignId", (req, res) => {
    try {
        const { campaignId } = req.params;
        const fs = require("fs");
        const path = require("path");
        const STATE_PATH = path.join(__dirname, "../data/agents/well-noticed-campaigns.json");
        const state = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
        const idx = state.campaigns.findIndex(c => c.id === campaignId);
        if (idx === -1) return res.status(404).json({ ok: false, error: "Campaign not found" });

        const campaign = state.campaigns[idx];
        const updates = req.body;

        if (updates.steps && Array.isArray(updates.steps)) {
            updates.steps.forEach(update => {
                const step = campaign.steps.find(s => s.step === update.step);
                if (step) {
                    if (update.subject !== undefined) step.subject = update.subject;
                    if (update.message !== undefined) step.message = update.message;
                    if (update.connectionNote !== undefined) step.connectionNote = update.connectionNote;
                }
            });
        }

        if (updates.executiveName) campaign.executiveName = updates.executiveName;
        if (updates.executiveEmail) campaign.executiveEmail = updates.executiveEmail;

        state.campaigns[idx] = campaign;
        fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
        res.json({ ok: true, data: campaign });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

router.post("/:campaignId/email/:stepNumber", async (req, res) => {
    try {
        const { campaignId, stepNumber } = req.params;
        const step = parseInt(stepNumber, 10);
        if (isNaN(step) || step < 1) {
            return res.status(400).json({ ok: false, error: "stepNumber must be a positive integer" });
        }

        const result = await executionService.executeEmailStep(campaignId, step);

        if (result.error && !result.skipped) {
            return res.status(400).json(result);
        }

        res.json({ ok: result.success, data: result });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

router.post("/:campaignId/website-form/:stepNumber", async (req, res) => {
    try {
        const { campaignId, stepNumber } = req.params;
        const step = parseInt(stepNumber, 10);
        if (isNaN(step) || step < 1) {
            return res.status(400).json({ ok: false, error: "stepNumber must be a positive integer" });
        }

        const result = await executionService.executeWebsiteFormStep(campaignId, step);

        if (result.error && !result.skipped) {
            return res.status(400).json(result);
        }

        res.json({ ok: result.success, data: result });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

router.post("/:campaignId/advance", (req, res) => {
    try {
        const { campaignId } = req.params;
        const campaign = executionService.getCampaignById(campaignId);

        if (!campaign) {
            return res.status(404).json({ ok: false, error: "Campaign not found" });
        }

        const nextStep = campaign.steps.find(s => s.status === "pending");
        if (!nextStep) {
            return res.status(400).json({ ok: false, error: "No pending steps to advance to", campaign });
        }

        nextStep.status = "ready";
        nextStep.readyAt = new Date().toISOString();
        campaign.currentStep = nextStep.step;

        const laterPending = campaign.steps.find(s => s.status === "pending" && s.step > nextStep.step);
        if (laterPending) {
            const delayMs = (laterPending.delayDays - nextStep.delayDays) * 86400000;
            campaign.nextActionAt = new Date(Date.now() + delayMs).toISOString();
        } else {
            campaign.nextActionAt = null;
        }

        const fs = require("fs");
        const path = require("path");
        const STATE_PATH = path.join(__dirname, "../data/agents/well-noticed-campaigns.json");
        const state = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
        const idx = state.campaigns.findIndex(c => c.id === campaignId);
        if (idx !== -1) state.campaigns[idx] = campaign;
        fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));

        res.json({ ok: true, data: { campaign, advancedTo: nextStep } });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

module.exports = router;
