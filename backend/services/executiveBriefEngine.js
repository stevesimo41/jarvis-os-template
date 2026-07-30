const goalEngine = require("./goalEngine");
const ventureEngine = require("./avoEngine");
const capitalEngine = require("./capitalEngine");
const selfImprovement =
    require("./selfImprovementEngine");
const adaptiveRecommendation =
    require("./adaptiveRecommendationEngine");
const researchEngine = require("./researchEngine");
const opportunityAgent = require("./opportunityAgent");
const patternEngine =
    require("./patternIntelligenceEngine");
const opportunities =
    opportunityAgent.generateOpportunityReport();

function generateExecutiveBrief() {

    const goals =
        goalEngine.prioritizeGoals();
    
    const ventures =
        ventureEngine.prioritizeVentures();

    const capital =
        capitalEngine.prioritizeCapitalSources();

    const research =
        researchEngine.prioritizeResearch();
    const patterns =
    patternEngine.analyzePatterns();

    const recommendation =
    adaptiveRecommendation.generateRecommendation();
    return {

        timestamp: new Date().toISOString(),

        priority: goals[0],

        revenueOpportunity: ventures[0],

        capitalOpportunity: capital[0],

        researchPriority: research[0],

       learningInsights:
    patterns, 
selfImprovement:
    selfImprovement.analyzePerformance(),

      recommendation:
    recommendation,
opportunityPipeline:
    opportunities.topOpportunities,

executionPlan: [
    goals[0].nextMilestone,
    ventures[0].nextAction,
    capital[0].nextAction,
    opportunities.topOpportunities[0].nextAction
]

    };

}


module.exports = {
    generateExecutiveBrief
};
