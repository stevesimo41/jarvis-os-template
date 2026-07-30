const executiveBrief =
    require("./executiveBriefEngine");

const patterns =
    require("./patternEngine");

const executionManager =
    require("./executionManager");


function generateRecommendation() {

    const brief =
        executiveBrief.generateExecutiveBrief();

    const intelligence =
        patterns.analyzePatterns();

    const execution =
        executionManager.readExecution();


    let recommendedAction;

    let reasoning;


    if (
        execution &&
        execution.status === "in_progress" &&
        execution.activeTask
    ) {

        recommendedAction =
            `Continue execution on ${execution.activeTask}`;

        reasoning =
            `JARVIS is currently executing ${execution.activeTask} for 
${execution.venture}. The active execution should remain the immediate 
priority until completed or blocked.`;

    }

    else {

        recommendedAction =
            brief.executionPlan[0];

        reasoning =
            intelligence.recommendation;

    }


    return {

        priority:
            brief.priority.name,

        recommendedAction,

        reasoning,

        learnedBehavior:
            intelligence.currentPattern,

        confidence:
            calculateConfidence(
                brief,
                intelligence
            )

    };

}


function calculateConfidence(
    brief,
    intelligence
) {

    let score = 5;


    if (
        brief.priority &&
        brief.executionPlan.length > 0
    ) {

        score += 2;

    }


    if (
        intelligence.outcomesTracked > 0
    ) {

        score += 2;

    }


    if (
        intelligence.decisionsTracked > 0
    ) {

        score += 1;

    }


    return score;

}


module.exports = {

    generateRecommendation

};
