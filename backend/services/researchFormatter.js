function formatResearchRecommendation(source) {

    return `
GOOD MORNING STEVE.

TOP RESEARCH PRIORITY

Topic:
${source.name}

Category:
${source.category}

Target:
${source.target}

Research Score:
${source.researchScore}/10

Reasoning:
${source.name} ranks highest because it has the strongest combination of 
importance, timing, and strategic value.

NEXT ACTION:
Monitor and gather intelligence on this area.
`;

}


module.exports = {
    formatResearchRecommendation
};
