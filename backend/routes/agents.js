const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");


function getAgents() {

    const agentsPath = path.join(
        __dirname,
        "../../agents"
    );

    const agents = fs.readdirSync(agentsPath);

    return agents.map(agent => {

        const file = path.join(
            agentsPath,
            agent,
            "agent.json"
        );

        if (fs.existsSync(file)) {

            const definition = JSON.parse(fs.readFileSync(file, "utf8"));
            const operational = ["chief-of-staff", "xodus-mission-partnership-agent", "venture-studio"].includes(definition.id);
            return {
                ...definition,
                status: operational ? "supervised" : "registry-only",
                operational,
                source: operational ? ({ "chief-of-staff": "chief-of-staff-operations-service", "venture-studio": "venture-revenue-agent-service", "xodus-mission-partnership-agent": "xodus-mission-agent-service" }[definition.id] || "operational-agent-service") : "static-agent-definition"
            };

        }

    }).filter(Boolean);

}


// Get all agents

router.get("/", (req,res)=>{

    res.json(
        getAgents()
    );

});


// Get individual agent

router.get("/:id", (req,res)=>{

    const agents = getAgents();

    const agent = agents.find(
        item => item.id === req.params.id
    );


    if (!agent) {

        return res.status(404).json({

            error:
            "Agent not found"

        });

    }


    res.json(agent);

});


module.exports = router;
