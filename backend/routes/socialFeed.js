const express = require("express");
const { requireRole } = require("../auth/localAuth");
const social = require("../services/socialFeedService");
const audit = require("../governance/auditLog");

const router = express.Router();

router.get("/", ...requireRole("viewer"), async (req, res) => {
    try {
        const platform = req.query.platform || undefined;
        const force = req.query.refresh === "true";
        const result = await social.getFeed(platform, force);
        res.json({ ok: true, data: result });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
});

router.get("/status", ...requireRole("viewer"), async (_req, res) => {
    try {
        const status = social.status();
        res.json({ ok: true, data: status });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
});

router.get("/accounts", ...requireRole("viewer"), async (_req, res) => {
    try {
        const accounts = social.listAccounts();
        res.json({ ok: true, data: accounts });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
});

router.post("/accounts", ...requireRole("owner"), async (req, res) => {
    try {
        const { platform, name, handle, url, slug } = req.body || {};
        if (!platform) return res.status(400).json({ ok: false, error: "platform is required" });
        if (!handle && !url && !slug) return res.status(400).json({ ok: false, error: "handle, url, or slug is required" });
        const account = social.addAccount({ platform, name, handle: handle || url || slug, url, slug });
        audit.append("social_account_added", { actor: req.auth.name, platform, name });
        res.json({ ok: true, data: account });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
});

router.delete("/accounts/:id", ...requireRole("owner"), async (req, res) => {
    try {
        social.removeAccount(req.params.id);
        audit.append("social_account_removed", { actor: req.auth.name, accountId: req.params.id });
        res.json({ ok: true });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
});

router.post("/refresh", ...requireRole("owner"), async (_req, res) => {
    try {
        const result = await social.getFeed(undefined, true);
        res.json({ ok: true, data: { feedCount: result.feeds.length, lastUpdated: result.lastUpdated } });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
});

module.exports = router;
