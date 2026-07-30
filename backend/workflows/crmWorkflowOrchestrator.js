const crm =
    require("../crm/crmEngine");

const researchAgent =
    require("../agents/researchAgent");


function buildOrganizationPlan(
    organization,
    ventureId
) {

    const analysis =
        researchAgent.analyzeOrganization(
            organization.id,
            ventureId
        );


    return {

        organizationId:
            organization.id,

        organizationName:
            organization.name,

        ventureId,

        decision:
            analysis.decision,

        execution: {

            agent:
                "researchAgent",

            status:
                "ready",

            action:
                analysis.decision.action

        },

        context: {

            contacts:
                analysis.contacts.length,

            interactions:
                analysis.interactions.length,

            pendingTasks:
                analysis.tasks.filter(
                    task =>
                        task.status ===
                        "pending"
                ).length

        }

    };

}


function planOrganization(
    organizationId,
    ventureId
) {

    const result =
        crm.getVenture(
            ventureId
        );


    if (!result) {

        throw new Error(
            `CRM venture not found: ${ventureId}`
        );

    }


    const organization =
        result.data.organizations.find(
            item =>
                item.id ===
                organizationId
        );


    if (!organization) {

        throw new Error(
            `CRM organization not found: ${organizationId}`
        );

    }


    return buildOrganizationPlan(
        organization,
        ventureId
    );

}


function planVenture(
    ventureId
) {

    const result =
        crm.getVenture(
            ventureId
        );


    if (!result) {

        throw new Error(
            `CRM venture not found: ${ventureId}`
        );

    }


    const organizations =
        result.data.organizations;


    const plans =
        organizations.map(
            organization =>
                buildOrganizationPlan(
                    organization,
                    ventureId
                )
        );


    return {

        venture: {

            id:
                result.venture.id,

            name:
                result.venture.name,

            type:
                result.venture.type,

            crmMode:
                result.venture.crmMode

        },

        count:
            plans.length,

        plans

    };

}


function getNextAction(
    ventureId
) {

    const result =
        planVenture(
            ventureId
        );


    const actionable =
        result.plans.filter(
            plan =>
                plan.decision &&
                plan.decision.action
        );


    return {

        venture:
            result.venture,

        actionCount:
            actionable.length,

        next:
            actionable[0] ||
            null

    };

}


module.exports = {

    planOrganization,

    planVenture,

    getNextAction

};
