const memory =
    require("./memoryIntelligence");

const learning =
    require("./learningEngine");


function analyzePatterns() {

    const data =
        memory.analyzeMemory();

    const learned =
        learning.analyzeLearning();

    return {

        decisionsTracked:
            data.totalDecisions,

        outcomesTracked:
            data.totalOutcomes,

        currentPattern:
            learned.lessons,

        recommendation:
            learned.recommendation

    };

}


module.exports = {

    analyzePatterns

};
