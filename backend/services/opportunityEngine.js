const fs = require("fs");
const path = require("path");

const opportunitiesPath = path.join(
    __dirname,
    "../memory/context/opportunities.json"
);


function getOpportunities() {

    const data = fs.readFileSync(
        opportunitiesPath,
        "utf8"
    );

    return JSON.parse(data);
}


function prioritizeOpportunities() {

    const opportunities =
        getOpportunities().opportunities;

    return opportunities
        .map(opportunity => {

            const valueScore =
                opportunity.potentialValue / 10000;

            const score =
                (valueScore * 0.50) +
                (opportunity.ease * 0.25) +
                (opportunity.alignment * 0.25);

            return {
                ...opportunity,
                opportunityScore:
                    Number(score.toFixed(2))
            };

        })
        .sort(
            (a,b) =>
            b.opportunityScore -
            a.opportunityScore
        );
}


module.exports = {
    getOpportunities,
    prioritizeOpportunities
};
