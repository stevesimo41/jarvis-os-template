function formatResponse(result) {

    if (result.intent === "EXECUTIVE") {

        const brief = result.response;

        return `

GOOD MORNING STEVE.

JARVIS EXECUTIVE BRIEF

PRIMARY MISSION:

${brief.priority.name}

EXECUTIVE SCORE:

${brief.priority.executiveScore}/10

NEXT MILESTONE:

${brief.priority.nextMilestone}


TOP REVENUE OPPORTUNITY:

${brief.revenueOpportunity.name}

NEXT ACTION:

${brief.revenueOpportunity.nextAction}


CAPITAL PRIORITY:

${brief.capitalOpportunity.name}

NEXT ACTION:

${brief.capitalOpportunity.nextAction}


TODAY'S EXECUTION PLAN:

${brief.executionPlan.map(
(item,index)=>`${index+1}. ${item}`
).join("\n")}

`;

    }


    if (result.intent === "RESEARCH") {

        return `

GOOD MORNING STEVE.

JARVIS RESEARCH PRIORITIES:


${result.response.map(
(item,index)=>
`${index+1}. ${item.name}
Category: ${item.category}
Target: ${item.target}
Score: ${item.researchScore}/10`
).join("\n\n")}

`;

    }


    return JSON.stringify(
        result.response,
        null,
        2
    );

}


module.exports = {
    formatResponse
};
