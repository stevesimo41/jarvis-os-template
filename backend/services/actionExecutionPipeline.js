const actionPlanner =
    require("./actionPlanner");

const actionExecutor =
    require("./actionExecutor");

const deliverableEngine =
    require("./deliverableEngine");

const prospectResearchEngine =
    require("./prospectResearchEngine");

const prospectQualificationEngine =
    require("./prospectQualificationEngine");

const prospectOutreachEngine =
    require("./prospectOutreachEngine");

const outreachMessageEngine =
    require("./outreachMessageEngine");

function runActionPipeline() {

    const actionPlan =
        actionPlanner.buildActionPlan();

    if (
        actionPlan.status === "no_action"
    ) {

        return {
            status: "idle",
            message:
                "JARVIS has no executable action available."
        };

    }

    const execution =
        actionExecutor.executeAction();

    const deliverable =
        deliverableEngine.generateDeliverable();

    const research =
        prospectResearchEngine.generateProspectList();

    const qualification =
        prospectQualificationEngine.qualifyProspects(
            research.prospects
        );

    const outreachPlan =
        prospectOutreachEngine.generateOutreachPlan(
            qualification.qualifiedProspects
        );

    const outreachMessages =
        outreachMessageEngine.generateOutreachMessages(
            outreachPlan
        );

    return {

        status:
            "pipeline_complete",

        actionPlan,

        execution,

        deliverable,

        research,

        qualification,

        outreachPlan,

        outreachMessages,

        nextStep:
            outreachMessages.nextStep

    };

}

module.exports = {
    runActionPipeline
};
