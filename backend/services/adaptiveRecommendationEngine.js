const patternEngine =
    require("./patternIntelligenceEngine");

const outcomeEngine =
    require("./outcomeEngine");


function generateRecommendation() {

    const patterns =
        patternEngine.analyzePatterns();

    const outcomes =
        outcomeEngine.getRecentOutcomes(10);

    let recommendation =
        "Continue current execution path.";

    let reasoning =
        "No significant deviation detected.";

    let confidence = 5;


    if (outcomes.length > 0) {

        recommendation =
            "Continue current objective while collecting additional execution data.";

        reasoning =
            "Previous outcomes indicate active progress and increasing system understanding.";

        confidence = 7;

    }


    if (patterns.patterns.length >= 2) {

        recommendation =
            "Maintain current strategy and prioritize completion of the active milestone.";

        reasoning =
            "Multiple execution patterns indicate consistent progress.";

        confidence = 8;

    }


    return {

        recommendation,

        reasoning,

        confidence,

        evidence: {

            outcomesReviewed:
                outcomes.length,

            patternsDetected:
                patterns.patterns.length

        }

    };

}


module.exports = {

    generateRecommendation

};
