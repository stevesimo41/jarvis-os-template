const express = require("express");
const router = express.Router();
router.post("/", (req, res) => {
    const agent = req.body.agent;
    res.json({ agent, status: "complete", result: "Agent analysis complete." });
});


module.exports = router;
