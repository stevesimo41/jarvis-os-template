const crm =
    require("../crm/crmEngine");

const marketDiscovery =
    require("../agents/marketDiscoveryAgent");

const prospectQualification =
    require("../agents/prospectQualificationAgent");

function discoverVenture(
    ventureId,
    candidates = null,
    mode = "simulate"
) {

    const ventureResult =
        crm.getVenture(
            ventureId
        );

    if (!ventureResult) {

        throw new Error(
            `Unknown venture: ${ventureId}`
        );

    }

    if (
        candidates === null &&
        ventureId === "well-noticed"
    ) {

        candidates =
            marketDiscovery
                .discoverLocalOhioProspects();

    }

    if (
        !Array.isArray(candidates)
    ) {

        candidates = [];

    }

    const discovery =
        marketDiscovery.discoverProspects(
            ventureId,
            candidates
        );

    const qualification =
        prospectQualification.qualifyProspects(
            discovery.newProspects
        );

    const nextActions =
        qualification.recommended.map(
            prospect => ({

                organizationName:
                    prospect.name,

                action:
                    "research_organization",

                reason:
                    "Qualified prospect requires organization research."

            })
        );

    return {

        venture:
            ventureResult.venture,

        mode,

        discovery,

        qualification,

        nextActions,

        crmMutations:
            false,

        externalActions:
            false,

        status:
            "simulation_only"

    };

}

module.exports = {
    discoverVenture
};
