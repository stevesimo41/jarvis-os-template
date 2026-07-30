const reasoning = require("./reasoning");
const formatter = require("./formatter");

const decisionEngine = require("./decisionEngine");
const decisionReasoner = require("./decisionReasoner");
const decisionFormatter = require("./decisionFormatter");
const decisionMemory = require("./decisionMemory");
const ventureEngine = require("./avoEngine");
const ventureFormatter = require("./avoFormatter");
const reflectionEngine =
    require("./reflectionEngine");
const workingMemory =
    require("./workingMemoryEngine");

const goalEngine = require("./goalEngine");
const executiveBriefEngine = require("./executiveBriefEngine");
const executiveBriefFormatter = require("./executiveBriefFormatter");
const executionAwarenessEngine =
    require("./executionAwarenessEngine");

const executionManager =
    require("./executionManager");

const executionFormatter =
    require("./executionFormatter");

const opportunityEngine = require("./opportunityEngine");
const opportunityFormatter = require("./opportunityFormatter");
const capitalEngine = require("./capitalEngine");
const capitalFormatter = require("./capitalFormatter");
const researchEngine = require("./researchEngine");
const researchFormatter = require("./researchFormatter");

const schedulerEngine = require("./schedulerEngine");
const schedulerFormatter = require("./schedulerFormatter");

function process(command) {

    const input = command.toLowerCase();
if (
    input.includes("reflect") ||
    input.includes("what did we learn") ||
    input.includes("lessons learned") ||
    input.includes("review progress")
) {

    const reflection =
        reflectionEngine.generateReflection();


    return {

        response:
`
JARVIS REFLECTION

Current Task:
${reflection.currentTask}

Latest Outcome:
${reflection.latestOutcome.task}

Result:
${reflection.latestOutcome.result}

Venture:
${reflection.latestOutcome.venture}

Reflection:
${reflection.reflection}

Next Focus:
${reflection.nextFocus}
`,

        memory:
            reflection

    };

}

if (
    input.includes("execution") ||
    input.includes("progress") ||
    input.includes("how am i doing") ||
    input.includes("status")
) {


    const awareness =
        executionAwarenessEngine.analyzeExecution();


    return {

        response:
            `
EXECUTION HEALTH

Task:
${awareness.task}

Venture:
${awareness.venture}

Agent:
${awareness.assignedAgent}

Status:
${awareness.status}

Health:
${awareness.health}

Time Active:
${awareness.ageHours} hours

Completed History:
${awareness.completedHistory}

Recommendation:
${awareness.recommendation}
`,

        memory:
            awareness

    };

}

if (
    input.includes("where am i") ||
    input.includes("current execution") ||
    input.includes("what am i working on") ||
    input.includes("active task")
) {

    const execution =
        executionManager.readExecution();


    return {

        response:
            executionFormatter.formatExecutionStatus(execution),

        memory:
            execution

    };

}

if (
    input.includes("where did we leave off") ||
    input.includes("what were we working on") ||
    input.includes("current task") ||
    input.includes("remind me") ||
    input.includes("continue where we stopped")
) {

    const memory =
        workingMemory.getCurrentTask();

    return {

        response:
`
STEVE, WE LEFT OFF HERE.

Mission:
${memory.currentMission}

Current Task:
${memory.currentTask}

Assigned Agent:
${memory.currentAgent}

Next Action:
${memory.nextAction}

Venture:
${memory.currentVenture}

Status:
ACTIVE
`,

        memory

    };

}

if (
    input.includes("schedule") ||
    input.includes("plan my day") ||
    input.includes("daily schedule") ||
    input.includes("organize my day")
) {

    const schedule =
        schedulerEngine.buildSchedule();

    return {
        response:
            schedulerFormatter.formatSchedule(schedule),
        memory: schedule
    };

}

if (
    input.includes("executive brief") ||
    input.includes("morning brief") ||
    input.includes("daily brief")
) {

    const brief =
        executiveBriefEngine.generateExecutiveBrief();

    return {
        response:
            executiveBriefFormatter.formatExecutiveBrief(brief),
        memory: brief
    };

}
if (
    input.includes("research") ||
    input.includes("monitor") ||
    input.includes("watch") ||
    input.includes("investigate")
) {

    const research =
        researchEngine.prioritizeResearch();

    const recommendation =
        research[0];

    return {
        response:
            
researchFormatter.formatResearchRecommendation(recommendation),
        memory: recommendation
    };

}

if (
    input.includes("capital") ||
    input.includes("funding") ||
    input.includes("fund")
) {

    const sources =
        capitalEngine.prioritizeCapitalSources();

    const recommendation =
        sources[0];

    return {
        response:
            capitalFormatter.formatCapitalRecommendation(recommendation),
        memory: recommendation
    };

}

if (
    input.includes("opportunity") ||
    input.includes("opportunities") ||
    input.includes("pursue")
) {

    const opportunities =
        opportunityEngine.prioritizeOpportunities();

    const recommendation =
        opportunities[0];

    return {
        response:
            
opportunityFormatter.formatOpportunityRecommendation(recommendation),
        memory: recommendation
    };

}
    if (
        input.includes("brief") ||
        input.includes("executive") ||
        input.includes("priorities")
    ) {

        const executiveBrief =
            reasoning.generateExecutiveBrief();

        return {
            response:
                formatter.formatExecutiveBrief(executiveBrief),
            memory: executiveBrief
        };

    }

    if (
        input.includes("focus") ||
        input.includes("today") ||
        input.includes("should i")
    ) {

        const goals =
    goalEngine.prioritizeGoals();

const decisions =
    goals.map(goal => ({
        decision: goal.name,
        score: goal.executiveScore,
        nextMilestone: goal.nextMilestone,
        category: goal.category
    }));

        const recommendation =
            decisionReasoner.explainDecision(decisions);

                decisionMemory.saveDecision(recommendation);

        return {
            response:
                decisionFormatter.formatDecision(recommendation),
            memory: recommendation
        };

    }


    if (
        input.includes("revenue") ||
        input.includes("venture") 
    ) {

        const ventures =
            ventureEngine.prioritizeVentures();

        const recommendation =
            ventures[0];

        return {
            response:
                
ventureFormatter.formatVentureRecommendation(recommendation),
            memory: recommendation
        };

    }

if (
    input.includes("opportunity") ||
    input.includes("pursue")
) {

    const opportunities =
        opportunityEngine.prioritizeOpportunities();

    const recommendation =
        opportunities[0];

    return {
        response:
            
opportunityFormatter.formatOpportunityRecommendation(recommendation),
        memory: recommendation
    };

}

    return {
        response: "Command understood but no workflow exists yet.",
        memory: {}
    };

}

module.exports = {
    process
};
