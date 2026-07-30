const decisionEngine =
    require("./decisionHistoryEngine");


function evaluateDecision(decisionId, outcome) {


    const evaluation = {

        timestamp:
            new Date().toISOString(),

        decisionId,

        outcome,

        assessment:
            "Decision outcome recorded.",

        learningAdjustment:
            "Future recommendations should consider this result."

    };


    return evaluation;

}


function evaluateRecentDecision(outcome) {

    const decisions =
        decisionEngine.getRecentDecisions(1);


    if (decisions.length === 0) {

        return {
            error:
                "No decisions available for evaluation."
        };

    }


    return evaluateDecision(
        decisions[0],
        outcome
    );

}


module.exports = {

    evaluateDecision,

    evaluateRecentDecision

};
