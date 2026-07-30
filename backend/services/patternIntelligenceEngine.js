const outcomeEngine =
    require("./outcomeEngine");


function analyzePatterns() {

    const outcomes =
        outcomeEngine.getRecentOutcomes(20);


    let patterns = [];


    if (outcomes.length > 0) {

        patterns.push({

            pattern:
                "Execution history is being captured.",

            evidence:
                outcomes.length + " recorded outcomes.",

            confidence:
                Math.min(
                    outcomes.length * 2,
                    10
                )

        });

    }


    if (outcomes.length >= 3) {

        patterns.push({

            pattern:
                "Multiple execution milestones completed.",

            evidence:
                "Consistent progress detected.",

            confidence:
                8

        });

    }


    return {

        analyzed:
            outcomes.length,

        patterns

    };

}


module.exports = {

    analyzePatterns

};
