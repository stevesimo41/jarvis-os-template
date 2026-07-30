const express = require("express");
const fs = require("fs");
const path = require("path");
const memory = require("../memory/memoryEngine");
const reasoning = require("../services/reasoning");
const formatter = require("../services/formatter");
const decisionReasoner = require("../services/decisionReasoner");
const decisionEngine = require("../services/decisionEngine");
const decisionFormatter = require("../services/decisionFormatter");
const decisionMemory = require("../services/decisionMemory");
const orchestrator = require("../services/orchestrator");
const conversation = require("../services/conversationalJarvisService");

const router = express.Router();
console.log("=== JARVIS ROUTE LOADED ===");

router.get("/conversation/status", (_req, res) => {
    res.json({ ok: true, data: conversation.status() });
});

router.post("/conversation", async (req, res) => {
    try {
        const result = await conversation.respond(req.body.messages);
        res.json({
            ok: true,
            data: result,
            meta: {
                externalActions: false,
                mutations: false,
                governanceRequiredForActions: true
            }
        });
    } catch (error) {
        res.status(error.status || 500).json({
            ok: false,
            error: error.status ? error.message : "JARVIS conversation failed."
        });
    }
});

router.post("/", (req, res) => {

    const command = (req.body.command || "").toLowerCase();

    let agentId = "chief-of-staff";

    if (command.includes("xodus")) {
        agentId = "xodus";
    } else if (command.includes("investment")) {
        agentId = "investment";
    } else if (command.includes("research")) {
        agentId = "research";
    } else if (command.includes("real estate")) {
        agentId = "real-estate";
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
            agent: agentId
        });
    }

    const agent = JSON.parse(
        fs.readFileSync(agentPath, "utf8")
    );

    let additionalContext = {};

let executiveBrief = null;
let decisionAnalysis = null;

if (
    command.includes("priority") ||
    command.includes("priorities") ||
    command.includes("brief") ||
    command.includes("executive")
) {
    executiveBrief = reasoning.generateExecutiveBrief();
    additionalContext = executiveBrief;
}

if (
    command.includes("focus") ||
    command.includes("today") ||
    command.includes("should i")
) {

    const decisions = decisionEngine.scoreDecision([
        {
            name: "Build JARVIS OS",
            impact: 10,
            service: 8,
            execution: 9,
            longTermValue: 10,
            financialSustainability: 6
        },
        {
            name: "Grow Xodus Recovery Pathways",
            impact: 10,
            service: 10,
            execution: 7,
            longTermValue: 10,
            financialSustainability: 5
        },
        {
            name: "Expand Well Noticed",
            impact: 8,
            service: 6,
            execution: 10,
            longTermValue: 8,
            financialSustainability: 10
        }
    ]);

    decisionAnalysis = decisionReasoner.explainDecision(decisions);

decisionMemory.saveDecision(decisionAnalysis);

additionalContext = decisionAnalysis;
}

    
const result =
    orchestrator.process(command);

res.json({
    routedTo: agent.name,
    command: req.body.command,
    response: result.response,
    mission: agent.mission,
    capabilities: agent.capabilities,
    memory: result.memory
});

});


const executiveBriefEngine = require("../services/canonicalExecutiveService");


router.get("/brief", (req, res) => {

    try {

        const brief =
            executiveBriefEngine.brief();

        res.json({
            status: "online",
            system: "JARVIS Executive Intelligence",
            brief
        });

    } catch (error) {

        res.status(500).json({
            error: error.message
        });

    }

});
const actionPlanner =
    require("../services/actionPlanner");


router.get("/action-plan", (req, res) => {

    try {

        const actionPlan =
            actionPlanner.buildActionPlan();

        res.json({

            status: "online",

            system: "JARVIS Action Planner",

            actionPlan

        });

    } catch (error) {

        res.status(500).json({

            status: "error",

            error: error.message

        });

    }

});
router.post("/execute-action", (req, res) => {

    try {

        const actionExecutor =
            require("../services/actionExecutor");

        const result =
            actionExecutor.executeAction();

        res.json({
            status: "online",
            system: "JARVIS Action Execution",
            execution: result
        });

    } catch (error) {

        res.status(500).json({
            status: "error",
            error: error.message
        });

    }

});
router.post("/execute-research", (req, res) => {

    try {

        const researchExecutionEngine =
            require("../services/researchExecutionEngine");

        const result =
            researchExecutionEngine.executeResearch();

        res.json({

            status: "online",

            system: "JARVIS Research Execution",

            research: result

        });

    } catch (error) {

        res.status(500).json({

            status: "error",

            error: error.message

        });

    }

});

module.exports = router;
