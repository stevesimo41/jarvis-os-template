const express = require("express");
const router = express.Router();
const replyService = require("../services/emailReplyService");

router.get("/status", async (req, res) => {
    try {
        const status = await replyService.getReplyStatus();
        res.json({ ok: true, data: status });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

router.post("/check", async (req, res) => {
    try {
        const result = await replyService.checkForReplies();
        res.json({ ok: true, data: result });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

module.exports = router;
