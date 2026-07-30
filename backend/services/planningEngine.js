const goalEngine = require("./goalEngine");
const ventureEngine = require("./avoEngine");
const opportunityEngine = require("./opportunityEngine");
const capitalEngine = require("./capitalEngine");
const researchEngine = require("./researchEngine");

function buildPlan() {

    const goals =
        goalEngine.prioritizeGoals();

    const ventures =
        ventureEngine.prioritizeVentures();

    const opportunities =
        opportunityEngine.prioritizeOpportunities();

    const capital =
        capitalEngine.prioritizeCapitalSources();

    const research =
        researchEngine.prioritizeResearch();

    return {

        executivePriority:
            goals[0],

        revenuePriority:
            ventures[0],

        opportunityPriority:
            opportunities[0],

        capitalPriority:
            capital[0],

        researchPriority:
            research[0],

        todaysPlan: [

            {
                priority: 1,
                action:
                    goals[0].nextMilestone
            },

            {
                priority: 2,
                action:
                    ventures[0].nextAction
            },

            {
                priority: 3,
                action:
                    capital[0].nextAction
            },

            {
                priority: 4,
                action:
                    opportunities[0].nextAction
            }

        ]

    };

}

module.exports = {
    buildPlan
};
