const nextActionEngine =
    require("./nextActionEngine");

const recommendationEngine =
    require("./recommendationEngine");

const executionEngine =
    require("./executionEngine");

function buildActionPlan() {

    const nextAction =
        nextActionEngine.getNextAction();

    const recommendation =
        recommendationEngine.generateRecommendation();

    if (
        !nextAction ||
        !nextAction.task
    ) {

        return {

            status: "no_action",

            task: null,

            venture: null,

            assignedAgent: "JARVIS",

            health: "IDLE",

            action: "No executable action available.",

            reasoning:
                "JARVIS has no active task ready for execution.",

            steps: []

        };

    }

    const task =
        nextAction.task;

    return {

        status: "ready_to_execute",

        task:
            task.title,

        venture:
            task.category,

        assignedAgent:
            "JARVIS",

        health:
            "HEALTHY",

        action:
            recommendation.recommendedAction,

        reasoning:
            recommendation.reasoning,

        steps: [

            "Review current execution state",

            "Continue execution on " +
                task.title,

            "Identify the next concrete deliverable",

            "Execute the deliverable",

            "Record the outcome",

            "Update JARVIS memory"

        ]

    };

}

module.exports = {

    buildActionPlan

};
