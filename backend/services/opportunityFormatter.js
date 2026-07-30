function formatOpportunityRecommendation(opportunity) {

    return `
GOOD MORNING STEVE.

TOP OPPORTUNITY TO PURSUE

Opportunity:
${opportunity.name}

Venture:
${opportunity.venture}

Category:
${opportunity.category}

Opportunity Score:
${opportunity.opportunityScore}/10

Reasoning:
${opportunity.name} ranks highest because it combines strategic value, 
execution potential, and alignment with your long term objectives.

NEXT ACTION:
${opportunity.nextAction}
`;

}

module.exports = {
    formatOpportunityRecommendation
};
