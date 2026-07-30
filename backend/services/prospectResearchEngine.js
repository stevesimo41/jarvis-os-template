const businessResearchEngine =
    require("./businessResearchEngine");

function generateProspectList() {

    const businesses =
        businessResearchEngine.researchBusinesses();

    return {
        status: "prospect_list_generated",
        venture: "Well Noticed",
        task: "Acquire additional local business partners",
        deliverable: "Central Ohio Business Partner Prospect List",
        prospects: businesses,
        totalProspects: businesses.length,
        nextStep:
            "Review and qualify the strongest prospects."
    };

}

module.exports = {
    generateProspectList
};
