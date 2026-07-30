function explainDecision(results) {

    const top = results[0];

    return {
        recommendation: top.decision,

        confidence:
            top.score >= 9
                ? "High"
                : top.score >= 7
                    ? "Moderate"
                    : "Low",

        score: top.score,

        reasoning:
            `${top.decision} is the highest leverage focus because it scored ${top.score}/10 based on strategic priority, mission alignment, and execution value.`,

        nextAction:
            top.nextMilestone
                ? `Focus next on: ${top.nextMilestone}.`
                : "Execute the highest leverage action while maintaining momentum."
    };

}

module.exports = {
    explainDecision
};
