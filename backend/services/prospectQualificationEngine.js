function qualifyProspects(prospects) {

    const qualified =
        prospects.filter(prospect => {

            return (
                prospect.name &&
                prospect.category &&
                prospect.location &&
                prospect.rationale
            );

        }).map(prospect => {

            return {
                ...prospect,

                qualificationStatus:
                    "qualified",

                qualificationScore:
                    7,

                qualificationReason:
                    "Business has sufficient information for initial Well Noticed prospect evaluation."
            };

        });

    return {

        status: "qualification_complete",

        totalReviewed:
            prospects.length,

        qualifiedCount:
            qualified.length,

        qualifiedProspects:
            qualified,

        nextStep:
            "Prioritize qualified prospects for outreach."

    };

}

module.exports = {
    qualifyProspects
};
