function formatCapitalRecommendation(source) {

    return `
GOOD MORNING STEVE.

TOP CAPITAL OPPORTUNITY

Source:
${source.name}

Type:
${source.type}

Category:
${source.category}

Capital Potential:
$${source.potentialValue.toLocaleString()}

Capital Score:
${source.capitalScore}/10

Reasoning:
${source.name} ranks highest because it combines capital potential, 
strategic fit, and alignment with long term objectives.

NEXT ACTION:
${source.nextAction}
`;
}


module.exports = {
    formatCapitalRecommendation
};
