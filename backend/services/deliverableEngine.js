const actionPlanner = require("./actionPlanner");

function generateDeliverable() {

    const actionPlan = actionPlanner.buildActionPlan();

    if (actionPlan.status === "no_action") {
        return {
            status: "idle",
            message: "JARVIS has no action requiring a deliverable."
        };
    }

    const task = actionPlan.task;
    const venture = actionPlan.venture;

    let deliverable = {
        type: "general",
        title: "Next Concrete Deliverable",
        description: "Define the next measurable piece of work.",
        owner: actionPlan.assignedAgent,
        venture: venture,
        task: task
    };

    if (task.toLowerCase().includes("business partners")) {

        deliverable = {
            type: "prospect_research",
            title: "Central Ohio Business Partner Prospect List",
            description: "Build a qualified list of local businesses that could benefit from participating in the Well Noticed direct mail campaign.",
            owner: actionPlan.assignedAgent,
            venture: venture,
            task: task,
            output: "A qualified prospect list with business name, category, location, website, contact information, and partnership rationale.",
            successCriteria: [
                "Identify qualified Central Ohio businesses",
                "Prioritize businesses with strong homeowner relevance",
                "Verify each business is locally relevant",
                "Record the business website",
                "Record available contact information",
                "Document why each business is a strong Well Noticed prospect"
            ],
            nextStep: "Generate the first qualified prospect list."
        };

    } else if (task.toLowerCase().includes("investor")) {

        deliverable = {
            type: "investor_research",
            title: "Mission Aligned Investor Outreach List",
            description: "Build a qualified list of potential investors aligned with the mission and growth opportunities of the ventures.",
            owner: actionPlan.assignedAgent,
            venture: venture,
            task: task,
            output: "A qualified investor list with investor name, organization, investment focus, location, website, and fit rationale.",
            successCriteria: [
                "Identify qualified investors",
                "Prioritize mission aligned capital",
                "Verify investment focus",
                "Record organization website",
                "Document strategic fit"
            ],
            nextStep: "Generate the first qualified investor list."
        };

    } else if (task.toLowerCase().includes("funding")) {

        deliverable = {
            type: "funding_research",
            title: "Strategic Funding Partner List",
            description: "Identify organizations and individuals that could provide strategic funding or partnership support.",
            owner: actionPlan.assignedAgent,
            venture: venture,
            task: task,
            output: "A prioritized list of potential strategic funding partners with fit rationale.",
            successCriteria: [
                "Identify potential funding partners",
                "Prioritize organizations aligned with the mission",
                "Record contact information",
                "Document strategic fit",
                "Prioritize highest potential relationships"
            ],
            nextStep: "Generate the first strategic funding partner list."
        };

    } else {

        deliverable = {
            type: "execution",
            title: "Next Execution Deliverable",
            description: "Define and complete the next measurable output associated with the active task.",
            owner: actionPlan.assignedAgent,
            venture: venture,
            task: task,
            output: "A completed work product that advances the active task.",
            successCriteria: [
                "Work product is clearly defined",
                "Work product directly advances the task",
                "Work product is measurable",
                "Work product can be reviewed and verified"
            ],
            nextStep: "Define the measurable work product."
        };

    }

    return {
        status: "deliverable_ready",
        deliverable
    };
}

module.exports = {
    generateDeliverable
};
