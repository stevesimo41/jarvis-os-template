const express = require("express");
const router = express.Router();
const contentAgent = require("../services/contentAgentService");
const websiteReview = require("../services/websiteReviewService");

router.get("/", (req, res) => {
    try {
        const status = contentAgent.status();
        const recent = contentAgent.getRecentContent(10);
        res.json({ status: "online", data: { status, recent } });
    } catch (error) {
        console.error("Content agent GET error:", error);
        res.status(500).json({ status: "error", message: error.message });
    }
});

router.get("/status", (req, res) => {
    try {
        res.json(contentAgent.status());
    } catch (error) {
        res.status(500).json({ status: "error", message: error.message });
    }
});

router.post("/website-review", async (req, res) => {
    try {
        const { url } = req.body;
        if (!url) return res.status(400).json({ status: "error", message: "url is required" });

        const result = await websiteReview.reviewWebsite(url);
        res.json({ status: "completed", data: result });
    } catch (error) {
        console.error("Website review error:", error);
        res.status(500).json({ status: "error", message: error.message });
    }
});

router.post("/social-post", (req, res) => {
    try {
        const { venture, topic, platforms, additionalContext } = req.body;
        if (!venture || !topic) {
            return res.status(400).json({ status: "error", message: "venture and topic are required" });
        }

        const platformsList = platforms || ["linkedin", "facebook", "instagram"];
        const posts = contentAgent.generateSocialPosts(venture, topic, platformsList, additionalContext);

        const prompts = {};
        for (const platform of platformsList) {
            prompts[platform] = contentAgent.generateSocialPostPrompt(venture, platform, topic, additionalContext);
        }

        res.json({ status: "completed", data: { posts, prompts } });
    } catch (error) {
        console.error("Social post error:", error);
        res.status(500).json({ status: "error", message: error.message });
    }
});

router.post("/print-ad", (req, res) => {
    try {
        const { venture, companyData, template } = req.body;
        if (!venture) {
            return res.status(400).json({ status: "error", message: "venture is required" });
        }

        const ad = contentAgent.generatePrintAd(venture, companyData || {}, template || "well-noticed-ad");
        const prompt = contentAgent.generatePrintAdPrompt(companyData || {}, venture, template || "well-noticed-ad");

        res.json({ status: "completed", data: { ad, prompt } });
    } catch (error) {
        console.error("Print ad error:", error);
        res.status(500).json({ status: "error", message: error.message });
    }
});

router.get("/recent", (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const recent = contentAgent.getRecentContent(limit);
        res.json({ status: "online", data: recent });
    } catch (error) {
        res.status(500).json({ status: "error", message: error.message });
    }
});

module.exports = router;
