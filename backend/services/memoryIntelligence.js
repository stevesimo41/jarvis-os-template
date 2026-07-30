const decisionHistory =
    require("./decisionHistoryEngine");

const outcomeEngine =
    require("./outcomeEngine");


function analyzeMemory() {

    const decisions =
        decisionHistory.getRecentDecisions();

    const outcomes =
        outcomeEngine.getRecentOutcomes();


    return {

        totalDecisions:
            decisions.length,

        totalOutcomes:
            outcomes.length,

        recentDecision:
            decisions[decisions.length - 1],

        recentOutcome:
            outcomes[outcomes.length - 1],

        learning:

            generateLearning(
                decisions,
                outcomes
            )

    };

}


function generateLearning(
    decisions,
    outcomes
) {

    if (
        decisions.length === 0 ||
        outcomes.length === 0
    ) {

        return "Insufficient history for learning.";

    }


    const latestOutcome =
        outcomes[outcomes.length - 1];


    return (
    "Recent execution pattern: " +
    latestOutcome.outcome.result +
    ". Continue prioritizing actions with measurable execution impact."
);

}


module.exports = {

    analyzeMemory

};
