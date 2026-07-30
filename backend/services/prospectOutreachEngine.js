function generateOutreachPlan(qualifiedProspects) {

    const outreach =
        qualifiedProspects.map((prospect, index) => {

            return {

                sequence:
                    index + 1,

                prospect:
                    prospect.name,

                category:
                    prospect.category,

                location:
                    prospect.location,

                website:
                    prospect.website,

                contact:
                    prospect.contact,

                qualificationScore:
                    prospect.qualificationScore,

                outreachStatus:
                    "ready",

                outreachObjective:
                    "Introduce Well Noticed and determine interest in participating as a local advertising partner.",

                nextAction:
                    "Prepare personalized outreach message.",

                rationale:
                    prospect.rationale

            };

        });

    return {

        status: "outreach_plan_ready",

        totalProspects:
            outreach.length,

        outreach,

        nextStep:
            "Prepare personalized outreach messages for the highest priority prospects."

    };

}

module.exports = {
    generateOutreachPlan
};
