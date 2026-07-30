const express = require("express");
const fs = require("fs");
const path = require("path");

const router = express.Router();

router.post("/", (req, res) => {

    const agentId = req.body.agent;
    const command = req.body.command;

    if (!agentId) {
        return res.status(400).json({
            error: "No agent specified"
        });
    }

    const agentPath = path.join(
        __dirname,
        "../../agents",
        agentId,
        "agent.json"
    );

    if (!fs.existsSync(agentPath)) {
        return res.status(404).json({
            error: "Agent not found",
            requestedAgent: agentId
        });
    }

    const agent = JSON.parse(
        fs.readFileSync(agentPath, "utf8")
    );

    res.json({
        agent: agent.name,
        status: agent.status,
        mission: agent.mission,
        capabilities: agent.capabilities,
        command: command,
        response:
            `${agent.name} received request. ` +
            `Executing within mission scope: ${agent.mission}`
    });

});

module.exports = router;
