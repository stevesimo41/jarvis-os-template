const actionPlanner = require("./actionPlanner");
const executionAwareness = require("./executionAwarenessEngine");
const deliverableEngine = require("./deliverableEngine");

function executeAction() {

    const actionPlan =
        actionPlanner.buildActionPlan();

    if (actionPlan.status === "no_action") {

        return {
            status: "idle",
            message: "JARVIS has no executable action available."
        };

    }

    const awareness =
        typeof executionAwareness.analyzeExecution === "function"
            ? executionAwareness.analyzeExecution()
            : {
                health: "HEALTHY"
            };

    const deliverableResult =
        deliverableEngine.generateDeliverable();

    return {

        status: "execution_started",

        task:
            actionPlan.task,

        venture:
            actionPlan.venture,

        assignedAgent:
            actionPlan.assignedAgent,

        action:
            actionPlan.action,

        health:
            awareness.health || "HEALTHY",

        phase:
            "execution",

        deliverable:
            deliverableResult.deliverable || null,

        nextStep:
            deliverableResult.deliverable
                ? deliverableResult.deliverable.nextStep
                : "Define the next concrete deliverable",

        message:
            "JARVIS has started execution and generated the next concrete deliverable."

    };

}

module.exports = {
    executeAction
};
