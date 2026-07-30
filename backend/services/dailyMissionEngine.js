const workingMemory =
    require("./workingMemoryEngine");

const recommendationEngine =
    require("./recommendationEngine");

const executiveBriefEngine =
    require("./executiveBriefEngine");

const nextActionEngine =
    require("./nextActionEngine");

const executionAwarenessEngine =
    require("./executionAwarenessEngine");


function buildMission() {

    const working =
        workingMemory.getCurrentTask();

    const brief =
        executiveBriefEngine.generateExecutiveBrief();

    const nextAction =
        nextActionEngine.getNextAction();

    const awareness =
        executionAwarenessEngine.analyzeExecution();


    return {

        timestamp:
            new Date().toISOString(),

        mission:
            brief.priority.name,

        strategicPriority:
            brief.priority.name,

        strategicMilestone:
            brief.priority.nextMilestone,

        currentFocus:
            nextAction.task
                ? nextAction.task.title
                : working.currentTask,

        focusType:
            nextAction.type,

        executionVenture:
            nextAction.task
                ? nextAction.task.category
                : null,

        nextAction:
            nextAction.task
                ? nextAction.task.title
                : null,

        executionHealth:
            awareness.health,

        recommendation:
            recommendationEngine
                .generateRecommendation()
                .recommendedAction,

        confidence:
            recommendationEngine
                .generateRecommendation()
                .confidence,

        upcomingActions:
            nextAction.task

    };

}


module.exports = {

    buildMission

};
