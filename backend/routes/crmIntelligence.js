const express = require("express");

const {
    buildProfile,
    invalidate
} = require("../services/prospectIntelligenceService");

const router = express.Router();

router.post("/analyze", (req, res) => {
    try {
        const prospect = req.body?.prospect;

        if (
            !prospect ||
            typeof prospect !== "object" ||
            Array.isArray(prospect)
        ) {
            return res.status(400).json({
                error: "A prospect object is required."
            });
        }

        return res.json({
            ok: true,
            profile: buildProfile(prospect)
        });
    } catch (error) {
        return res.status(500).json({
            error:
                error?.message ||
                "Prospect intelligence analysis failed."
        });
    }
});

router.post("/invalidate", (req, res) => {
    try {
        const prospect = req.body?.prospect;

        if (
            !prospect ||
            typeof prospect !== "object" ||
            Array.isArray(prospect)
        ) {
            return res.status(400).json({
                error: "A prospect object is required."
            });
        }

        return res.json({
            ok: true,
            result: invalidate(prospect)
        });
    } catch (error) {
        return res.status(500).json({
            error:
                error?.message ||
                "Prospect intelligence cache invalidation failed."
        });
    }
});

module.exports = router;
