const deliverableEngine = require("./deliverableEngine");

function executeResearch() {

    const result =
        deliverableEngine.generateDeliverable();

    if (
        result.status !== "deliverable_ready" ||
        !result.deliverable
    ) {

        return {
            status: "idle",
            message: "No research deliverable is currently available."
        };

    }

    const deliverable =
        result.deliverable;

    if (
        deliverable.type !== "prospect_research" &&
        deliverable.type !== "investor_research" &&
        deliverable.type !== "funding_research"
    ) {

        return {
            status: "not_research",
            message:
                "The current deliverable does not require research execution.",
            deliverable
        };

    }

    return {

        status: "research_ready",

        venture:
            deliverable.venture,

        task:
            deliverable.task,

        deliverable:
            deliverable.title,

        researchObjective:
            deliverable.description,

        requiredOutput:
            deliverable.output,

        successCriteria:
            deliverable.successCriteria,

        executionStatus:
            "Research execution is ready to begin.",

        nextStep:
            deliverable.nextStep

    };

}

module.exports = {
    executeResearch
};
