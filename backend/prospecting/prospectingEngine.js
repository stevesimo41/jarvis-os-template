const repository =
    require("../crm/crmRepository");

function getProspectState(
    organizationId
) {

    const organizations =
        repository.getAll(
            "organizations"
        );

    const organization =
        organizations.find(
            item =>
                item.id === organizationId
        );

    if (!organization) {

        return null;

    }

    const contacts =
        repository.getByVenture(
            "contacts",
            organization.ventureId
        )
        .filter(
            contact =>
                contact.organizationId ===
                organizationId
        );

    const interactions =
        repository.getByVenture(
            "interactions",
            organization.ventureId
        )
        .filter(
            interaction =>
                interaction.organizationId ===
                organizationId
        );

    const tasks =
        repository.getByVenture(
            "tasks",
            organization.ventureId
        )
        .filter(
            task =>
                task.organizationId ===
                organizationId
        );

    return {
        organization,
        contacts,
        interactions,
        tasks
    };

}

function determineNextAction(
    organizationId
) {

    const state =
        getProspectState(
            organizationId
        );

    if (!state) {

        throw new Error(
            "Prospect organization not found"
        );

    }

    const {
        organization,
        contacts,
        interactions,
        tasks
    } = state;

    if (
        organization.relationshipStatus ===
        "not_interested"
    ) {

        return {
            action: "stop",
            reason: "Prospect is not interested"
        };

    }

    if (
        organization.relationshipStatus ===
        "do_not_contact"
    ) {

        return {
            action: "stop",
            reason: "Prospect requested no contact"
        };

    }

    const pendingTask =
        tasks.find(
            task =>
                task.status === "pending"
        );

    if (pendingTask) {

        return {
            action: pendingTask.action,
            reason:
                "Existing pending task",
            taskId:
                pendingTask.id
        };

    }

    if (
        interactions.length === 0
    ) {

        return {
            action: "research",
            reason:
                "No prior outreach or interaction exists"
        };

    }

    const lastInteraction =
        interactions
            .sort(
                (a, b) =>
                    new Date(
                        b.occurredAt
                    ) -
                    new Date(
                        a.occurredAt
                    )
            )[0];

    if (
        lastInteraction.result ===
        "response_received"
    ) {

        return {
            action:
                "active_conversation",
            reason:
                "Prospect responded"
        };

    }

    if (
        lastInteraction.result ===
        "not_interested"
    ) {

        return {
            action:
                "stop",
            reason:
                "Prospect is not interested"
        };

    }

    if (
        lastInteraction.result ===
        "no_response" &&
        lastInteraction.channel ===
        "website"
    ) {

        const contactWithEmail =
            contacts.find(
                contact =>
                    contact.email
            );

        if (
            !contactWithEmail
        ) {

            return {
                action:
                    "find_email",
                reason:
                    "Website outreach received no response and no contact email exists"
            };

        }

        return {
            action:
                "email_outreach",
            reason:
                "Website outreach received no response but contact email exists",
            contactId:
                contactWithEmail.id
        };

    }

    if (
        lastInteraction.result ===
        "no_response" &&
        lastInteraction.channel ===
        "email"
    ) {

        return {
            action:
                "follow_up",
            reason:
                "Email outreach received no response"
        };

    }

    return {
        action:
            "research",
        reason:
            "No matching workflow condition"
    };

}

module.exports = {
    getProspectState,
    determineNextAction
};
