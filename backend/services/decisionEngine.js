const scoring = require("./scoringFramework");
const memory = require("../memory/memoryEngine");

function scoreDecision(options) {

    const context = memory.getExecutiveContext();

    return options.map(option => {

        const score = scoring.calculateWeightedScore(option);

        return {
            decision: option.name,
            score: Number(score.toFixed(2)),
            alignedWith: context.executive.decision_framework
        };

    }).sort((a,b) => b.score - a.score);

}

module.exports = {
    scoreDecision
};
