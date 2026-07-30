const repository = require("../crm/crmRepository");
const researchAgent = require("../agents/researchAgent");

function executeOrganization(
    organizationId,
    ventureId,
    mode = "simulate"
) {
    if (mode !== "simulate") {
        throw new Error(
            "Only simulation mode is enabled."
        );
    }

    const organization =
        repository.getById(
            "organizations",
            organizationId
        );

    if (!organization) {
        throw new Error(
            `Organization not found: ${organizationId}`
        );
    }

    const contacts =
        repository
            .getByVenture(
                "contacts",
                ventureId
            )
            .filter(
                contact =>
                    contact.organizationId ===
                    organizationId
            );

    const interactions =
        repository
            .getByVenture(
                "interactions",
                ventureId
            )
            .filter(
                interaction =>
                    interaction.organizationId ===
                    organizationId
            );

    const tasks =
        repository
            .getByVenture(
                "tasks",
                ventureId
            )
            .filter(
                task =>
                    task.organizationId ===
                    organizationId
            );

    const pendingTasks =
        tasks.filter(
            task =>
                task.status === "pending"
        );

    const decision =
        researchAgent.analyzeOrganization(
            organizationId,
            ventureId
        );

    const simulation =
        buildSimulation(
            decision,
            organization,
            contacts,
            interactions,
            pendingTasks
        );

    return {
        organizationId,
        organizationName: organization.name,
        ventureId,
        mode,
        decision,
        simulation,
        execution: {
            executed: false,
            externalActions: false,
            crmMutations: false,
            status: "simulation_only"
        },
        agent: "crmExecutionBridge",
        status: "simulated",
        simulatedAt:
            new Date().toISOString()
    };
}

function buildSimulation(
    decision,
    organization,
    contacts,
    interactions,
    pendingTasks
) {
    const action =
        decision.decision.action;

    const base = {
        currentState: {
            organization:
                organization.name,
            contacts:
                contacts.length,
            interactions:
                interactions.length,
            pendingTasks:
                pendingTasks.length
        },
        wouldDo: [],
        wouldUpdate: [],
        wouldCreate: [],
        externalActions: []
    };

    switch (action) {
        case "find_email":
        case "find_executive_email":
            return {
                ...base,
                wouldDo: [
                    "Research organization leadership",
                    "Identify the executive decision maker",
                    "Locate a public business email address",
                    "Verify the contact information",
                    "Associate the decision maker with the CRM organization"
                ],
                wouldUpdate: [
                    "CRM organization",
                    "CRM contact",
                    "Existing research task"
                ],
                wouldCreate: [
                    "Email outreach task"
                ],
                externalActions: [
                    "No email will be sent",
                    "No external outreach will occur"
                ]
            };

        case "research_organization":
            return {
                ...base,
                wouldDo: [
                    "Research organization website",
                    "Research company information",
                    "Identify leadership",
                    "Identify relevant decision makers"
                ],
                wouldUpdate: [
                    "CRM organization",
                    "CRM contacts"
                ],
                wouldCreate: [
                    "Research follow up task"
                ],
                externalActions: [
                    "No external communication will occur"
                ]
            };

        case "website_outreach":
            return {
                ...base,
                wouldDo: [
                    "Review organization website",
                    "Prepare website outreach",
                    "Record intended website outreach"
                ],
                wouldUpdate: [
                    "CRM organization",
                    "CRM interaction"
                ],
                wouldCreate: [
                    "Website follow up task"
                ],
                externalActions: [
                    "Website outreach will NOT be sent"
                ]
            };

        case "email_outreach":
        case "send_email":
            return {
                ...base,
                wouldDo: [
                    "Prepare personalized email",
                    "Identify decision maker",
                    "Prepare outreach message"
                ],
                wouldUpdate: [
                    "CRM organization",
                    "CRM contact"
                ],
                wouldCreate: [
                    "Email interaction",
                    "Follow up task"
                ],
                externalActions: [
                    "Email will NOT be sent"
                ]
            };

        default:
            return {
                ...base,
                wouldDo: [
                    `Simulate action: ${action}`
                ],
                externalActions: [
                    "No external action will occur"
                ]
            };
    }
}

module.exports = {
    executeOrganization
};
