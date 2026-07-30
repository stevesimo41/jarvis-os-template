function researchOrganization(input) {

    if (!input) {
        throw new Error(
            "Research input is required"
        );
    }

    const {
        organizationId,
        organizationName,
        ventureId
    } = input;

    if (!organizationId) {
        throw new Error(
            "organizationId is required"
        );
    }

    if (!organizationName) {
        throw new Error(
            "organizationName is required"
        );
    }

    return {

        organizationId,

        ventureId:
            ventureId || null,

        organization: {

            name:
                organizationName,

            website:
                null,

            phone:
                null,

            industry:
                null,

            city:
                null,

            state:
                null

        },

        leadership: [],

        contacts: [],

        researchStatus:
            "pending",

        nextAction:
            "research_organization",

        notes: [],

        researchedAt:
            null

    };

}

module.exports = {
    researchOrganization
};
