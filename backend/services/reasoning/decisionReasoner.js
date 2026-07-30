function explainDecision(results) {

    const top = results[0];

    return {
        recommendation: top.decision,
        confidence:
            top.score >= 8.5
                ? "High"
                : "Moderate",

        reasoning:
            `${top.decision} ranks highest because it best aligns with 
impact, service, execution, and long term value.`,

        score: top.score
    };

}

module.exports = {
    explainDecision
};
