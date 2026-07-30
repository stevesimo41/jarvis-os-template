function formatExecutiveBrief(brief) {

return `

GOOD MORNING STEVE.

JARVIS EXECUTIVE BRIEF

TOP PRIORITY:

${brief.priority.name}

Score:
${brief.priority.executiveScore}/10

Next Milestone:
${brief.priority.nextMilestone}


TOP REVENUE OPPORTUNITY:

${brief.revenueOpportunity.name}

Score:
${brief.revenueOpportunity.ventureScore}/10

Next Action:
${brief.revenueOpportunity.nextAction}


TOP CAPITAL OPPORTUNITY:

${brief.capitalOpportunity.name}

Potential:
$${brief.capitalOpportunity.potentialValue.toLocaleString()}

Next Action:
${brief.capitalOpportunity.nextAction}


TOP RESEARCH PRIORITY:

${brief.researchPriority.name}

Target:
${brief.researchPriority.target}


TODAY'S EXECUTION PLAN:

1. ${brief.executionPlan[0]}
2. ${brief.executionPlan[1]}
3. ${brief.executionPlan[2]}

`;

}


module.exports = {
    formatExecutiveBrief
};
