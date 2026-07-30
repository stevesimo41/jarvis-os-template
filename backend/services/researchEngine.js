const fs = require("fs");
const path = require("path");

const researchPath = path.join(
    __dirname,
    "../memory/context/researchSources.json"
);


function getResearchSources() {

    const data = fs.readFileSync(
        researchPath,
        "utf8"
    );

    return JSON.parse(data);
}


function prioritizeResearch() {

    const sources =
        getResearchSources().researchSources;


    return sources
        .map(source => {

            const score =
                (source.importance * 0.60) +
                (source.frequency === "daily" ? 4 : 2);

            return {
                ...source,
                researchScore:
                    Number(score.toFixed(2))
            };

        })
        .sort(
            (a,b) =>
            b.researchScore -
            a.researchScore
        );

}


module.exports = {
    getResearchSources,
    prioritizeResearch
};
