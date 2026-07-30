const intentEngine =
    require("./intentEngine");

const executiveBriefEngine =
    require("./executiveBriefEngine");

const researchEngine =
    require("./researchEngine");

const capitalEngine =
    require("./capitalEngine");

const recommendationEngine =
    require("./recommendationEngine");

const goalEngine =
    require("./goalEngine");

const opportunityEngine =
    require("./opportunityEngine");

const executionEngine =
    require("./executionEngine");

const memoryIntelligence =
    require("./memoryIntelligence");


function route(message) {

    const intent =
        intentEngine.detectIntent(message);


    let response;


    switch(intent) {


        case "GOALS":

            response = {
                type: "Goals Analysis",
                goals:
                goalEngine.prioritizeGoals()
            };

            break;


        case "CAPITAL":

            response =
                capitalEngine
                .prioritizeCapitalSources();

            break;


        case "RESEARCH":

            response =
                researchEngine
                .prioritizeResearch();

            break;


        case "OPPORTUNITIES":

            response = {
                type: "Opportunity Analysis",
                opportunities:
                opportunityEngine
                .prioritizeOpportunities()
            };

            break;


        case "EXECUTION":

            response = {
                type: "Execution Queue",
                tasks:
                executionEngine
                .getReadyTasks()
            };

            break;


        case "MEMORY":

            response =
                memoryIntelligence
                .analyzeMemory();

            break;


        case "EXECUTIVE":

            response =
                executiveBriefEngine
                .generateExecutiveBrief();

            break;


        default:

            response =
            recommendationEngine
            .generateRecommendation();

    }


    return {

        intent,

        response

    };

}


module.exports = {

    route

};
