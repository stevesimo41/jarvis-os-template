const opportunityEngine = require("./opportunityEngine");


function generateOpportunityReport() {

    const opportunities =
        opportunityEngine.prioritizeOpportunities();


    return {
        timestamp:
            new Date().toISOString(),

        topOpportunities:
            opportunities.slice(0,3)
    };

}


module.exports = {
    generateOpportunityReport
};

