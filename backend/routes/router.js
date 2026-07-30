const express = require("express");
const router = express.Router();

router.post("/", (req, res) => {

    const command = (req.body.command || "").toLowerCase();

    let agent = "Chief of Staff";

    if (command.includes("xodus")) {
        agent = "Xodus";
    } else if (command.includes("investment")) {
        agent = "Investment";
    } else if (command.includes("research")) {
        agent = "Research";
    } else if (command.includes("real estate")) {
        agent = "Real Estate";
    } else if (command.includes("well noticed")) {
        agent = "Venture Studio";
    } else if (command.includes("automation")) {
        agent = "Automation";
    }

    res.json({
        routedTo: agent,
        command
    });

});

module.exports = router;
