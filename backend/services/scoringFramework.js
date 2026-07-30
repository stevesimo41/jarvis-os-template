const framework = {
    impact: 0.25,
    service: 0.20,
    execution: 0.15,
    longTermValue: 0.25,
    financialSustainability: 0.15
};

function calculateWeightedScore(decision) {

    return (
        decision.impact * framework.impact +
        decision.service * framework.service +
        decision.execution * framework.execution +
        decision.longTermValue * framework.longTermValue +
        decision.financialSustainability * 
framework.financialSustainability
    );

}

module.exports = {
    framework,
    calculateWeightedScore
};
