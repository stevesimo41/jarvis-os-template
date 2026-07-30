const express = require("express");
const { requireRole } = require("../auth/localAuth");
const audit = require("../governance/auditLog");
const yt = require("../services/youtubeService");
const multer = require("multer");

const upload = multer({ dest: "/tmp/jarvis-youtube-uploads" });
const router = express.Router();

router.get("/status", (_req, res) => {
    res.json({ ok: true, data: yt.status() });
});

router.get("/channel", async (_req, res) => {
    try {
        const channel = await yt.getChannelInfo();
        if (!channel) return res.status(404).json({ ok: false, error: "No YouTube channel found on this account" });
        res.json({ ok: true, data: channel });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
});

router.get("/videos", async (req, res) => {
    try {
        const videos = await yt.listVideos(parseInt(req.query.max) || 10);
        res.json({ ok: true, data: { videos, total: videos.length } });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
});

router.get("/videos/:id", async (req, res) => {
    try {
        const details = await yt.getVideoDetails(req.params.id);
        if (!details) return res.status(404).json({ ok: false, error: "Video not found" });
        res.json({ ok: true, data: details });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
});

router.post("/upload", requireRole("owner"), upload.single("video"), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ ok: false, error: "No video file provided" });
        const result = await yt.uploadVideo({
            filePath: req.file.path,
            title: req.body.title || "Untitled",
            description: req.body.description || "",
            tags: req.body.tags ? req.body.tags.split(",").map(t => t.trim()) : [],
            categoryId: req.body.categoryId || "22",
            privacyStatus: req.body.privacyStatus || "private"
        });
        audit.append("youtube_video_uploaded", { actor: req.auth.name, requestId: req.id, videoId: result.id, title: result.snippet?.title });
        res.json({ ok: true, data: { id: result.id, title: result.snippet?.title, status: result.status?.privacyStatus } });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
});

router.patch("/videos/:id", requireRole("owner"), async (req, res) => {
    try {
        const result = await yt.updateVideoMetadata(req.params.id, {
            title: req.body.title,
            description: req.body.description,
            tags: req.body.tags,
            categoryId: req.body.categoryId
        });
        audit.append("youtube_video_updated", { actor: req.auth.name, requestId: req.id, videoId: req.params.id });
        res.json({ ok: true, data: { id: result.id, title: result.snippet?.title } });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
});

router.post("/playlists", requireRole("owner"), async (req, res) => {
    try {
        const playlist = await yt.createPlaylist({
            title: req.body.title,
            description: req.body.description,
            privacyStatus: req.body.privacyStatus || "private"
        });
        audit.append("youtube_playlist_created", { actor: req.auth.name, requestId: req.id, playlistId: playlist.id });
        res.json({ ok: true, data: { id: playlist.id, title: playlist.snippet?.title } });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
});

router.post("/playlists/:id/videos", requireRole("owner"), async (req, res) => {
    try {
        if (!req.body.videoId) return res.status(400).json({ ok: false, error: "videoId required" });
        const result = await yt.addVideoToPlaylist(req.params.id, req.body.videoId);
        res.json({ ok: true, data: { playlistItemId: result.id } });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
});

router.post("/generate-metadata", requireRole("owner"), async (req, res) => {
    try {
        const { projectTitle, projectDescription, contentStrategy, scriptOutline } = req.body;
        if (!projectTitle) return res.status(400).json({ ok: false, error: "projectTitle required" });
        const metadata = yt.generateVideoMetadata(projectTitle, projectDescription, contentStrategy, scriptOutline);
        res.json({ ok: true, data: metadata });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
});

router.post("/link-projects", requireRole("owner"), async (_req, res) => {
    try {
        const result = await yt.linkChannelToProjects();
        if (!result) return res.status(404).json({ ok: false, error: "No YouTube channel found on this account" });
        audit.append("youtube_linked_projects", { actor: _req.auth.name, requestId: _req.id, channelId: result.channel.id, projectsUpdated: result.linkedToProjects });
        res.json({ ok: true, data: result });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
});

module.exports = router;