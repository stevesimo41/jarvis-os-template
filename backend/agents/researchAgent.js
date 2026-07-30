const crm = require("../crm/crmEngine");

const ACTIONS = {
    RESEARCH_ORGANIZATION: "research_organization",
    FIND_WEBSITE: "find_website",
    WEBSITE_OUTREACH: "website_outreach",
    FIND_EXECUTIVE_EMAIL: "find_executive_email",
    SEND_EMAIL: "send_email",
    FOLLOW_UP: "follow_up",
    ACTIVE_CONVERSATION: "active_conversation"
};

function getOrganizationContext(
    organizationId,
    ventureId
) {

    const result =
        crm.getVenture(ventureId);

    if (!result) {
        throw new Error(
            `CRM venture not found: ${ventureId}`
        );
    }

    const organization =
        result.data.organizations.find(
            item =>
                item.id === organizationId
        );

    if (!organization) {
        throw new Error(
            `CRM organization not found: ${organizationId}`
        );
    }

    const contacts =
        result.data.contacts.filter(
            contact =>
                contact.organizationId ===
                organizationId
        );

    const interactions =
        result.data.interactions.filter(
            interaction =>
                interaction.organizationId ===
                organizationId
        );

    const tasks =
        result.data.tasks.filter(
            task =>
                task.organizationId ===
                organizationId
        );

    return {
        venture:
            result.venture,

        organization,

        contacts,

        interactions,

        tasks
    };
}

function determineNextAction(
    context
) {

    const {
        organization,
        contacts,
        interactions,
        tasks
    } = context;


    /*
    STEP 1
    Protect active relationships.
    */

    if (
        organization.relationshipStatus ===
        "active_conversation"
    ) {

        return {
            action:
                ACTIONS.ACTIVE_CONVERSATION,

            reason:
                `Organization is already in active communication.`
        };

    }


    /*
    STEP 2
    Never duplicate an existing pending task.
    */

    const pendingTask =
        tasks.find(
            task =>
                task.status ===
                "pending"
        );

    if (pendingTask) {

        return {

            action:
                pendingTask.action,

            reason:
                `Existing pending CRM task should be completed first.`,

            taskId:
                pendingTask.id

        };

    }


    /*
    STEP 3
    Review historical outreach.
    */

    const hasWebsiteOutreach =
        interactions.some(
            interaction =>

                interaction.channel ===
                    "website" &&

                interaction.direction ===
                    "outbound"
        );


    const hasEmailOutreach =
        interactions.some(
            interaction =>

                interaction.channel ===
                    "email" &&

                interaction.direction ===
                    "outbound"
        );


    const hasOutreach =
        interactions.some(
            interaction =>

                interaction.type ===
                    "outreach" &&

                interaction.direction ===
                    "outbound"
        );


    /*
    STEP 4
    Website outreach already happened.
    Do not repeat it.
    */

    if (hasWebsiteOutreach) {

        const hasDecisionMakerEmail =
            contacts.some(
                contact =>
                    Boolean(
                        contact.email
                    ) &&
                    contact.decisionMaker ===
                    true
            );


        /*
        Website outreach happened.
        No decision maker email exists.
        */

        if (!hasDecisionMakerEmail) {

            return {

                action:
                    ACTIONS.FIND_EXECUTIVE_EMAIL,

                reason:
                    `Website outreach has already occurred. No executive
decision maker email is available.`

            };

        }


        /*
        Decision maker email exists.
        Email outreach has not happened.
        */

        if (!hasEmailOutreach) {

            return {

                action:
                    ACTIONS.SEND_EMAIL,

                reason:
                    `Website outreach has occurred and a decision maker
email is available, but email outreach has not occurred.`

            };

        }

    }


    /*
    STEP 5
    No website and no website outreach.
    */

    const hasWebsite =
        Boolean(
            organization.website
        );


    if (
        !hasWebsite &&
        !hasWebsiteOutreach
    ) {

        return {

            action:
                ACTIONS.FIND_WEBSITE,

            reason:
                `Organization does not have a website in CRM and no
website outreach has been recorded.`

        };

    }


    /*
    STEP 6
    Website exists but outreach has not happened.
    */

    if (
        hasWebsite &&
        !hasWebsiteOutreach
    ) {

        return {

            action:
                ACTIONS.WEBSITE_OUTREACH,

            reason:
                `Organization has a website but no website outreach has
been recorded.`

        };

    }


    /*
    STEP 7
    Outreach exists but no active conversation.
    */

    if (hasOutreach) {

        return {

            action:
                ACTIONS.FOLLOW_UP,

            reason:
                `Outreach has occurred. The next step is to schedule or
execute the next follow up.`

        };

    }


    /*
    STEP 8
    Fallback.
    */

    return {

        action:
            ACTIONS.RESEARCH_ORGANIZATION,

        reason:
            `No clear outreach path exists. Research the organization and
determine the next best action.`

    };

}


function analyzeOrganization(
    organizationId,
    ventureId
) {

    const context =
        getOrganizationContext(
            organizationId,
            ventureId
        );


    const next =
        determineNextAction(
            context
        );


    return {

        organizationId,

        ventureId,

        organization:
            context.organization,

        contacts:
            context.contacts,

        interactions:
            context.interactions,

        tasks:
            context.tasks,

        decision:
            next,

        agent:
            "researchAgent",

        status:
            "analyzed",

        analyzedAt:
            new Date().toISOString()

    };

}


module.exports = {

    ACTIONS,

    getOrganizationContext,

    determineNextAction,

    analyzeOrganization

};
