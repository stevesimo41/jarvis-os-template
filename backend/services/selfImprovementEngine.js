const decisionEngine =
    require("./decisionHistoryEngine");

const evaluationMemory =
    require("./evaluationMemoryEngine");


function analyzePerformance() {

    const decisions =
        decisionEngine.getRecentDecisions(10);


    const evaluations =
        evaluationMemory.getRecentEvaluations(10);


    const completed =
        evaluations.length;


    let assessment =
        "Insufficient execution history.";


    let confidenceAdjustment =
        0;


    if (completed > 0) {

        assessment =
            "Execution feedback is available for learning.";

        confidenceAdjustment =
            1;

    }


    return {

        timestamp:
            new Date().toISOString(),

        decisionsReviewed:
            decisions.length,

        evaluationsReviewed:
            evaluations.length,

        assessment,

        confidenceAdjustment,

        recommendation:
            "Use historical outcomes to improve future decisions."

    };

}


module.exports = {

    analyzePerformance

};
