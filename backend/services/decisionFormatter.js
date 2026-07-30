function formatDecision(decision) {

    return `
GOOD MORNING STEVE.

TODAY'S EXECUTIVE RECOMMENDATION

Priority:
${decision.recommendation}

Confidence:
${decision.confidence}

Score:
${decision.score}/10

Reasoning:
${decision.reasoning}

NEXT ACTION:
${decision.nextAction}
`;
}

module.exports = {
    formatDecision
};
