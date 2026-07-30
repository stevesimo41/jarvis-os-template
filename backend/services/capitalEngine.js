const fs = require("fs");
const path = require("path");

const capitalPath = path.join(
    __dirname,
    "../memory/context/capitalSources.json"
);


function getCapitalSources() {

    const data = fs.readFileSync(
        capitalPath,
        "utf8"
    );

    return JSON.parse(data);
}


function prioritizeCapitalSources() {

    const sources =
        getCapitalSources().capitalSources;

    return sources
        .map(source => {

            const score =
                (source.potentialValue / 100000 * 0.40) +
                (source.fit * 0.25) +
                (source.accessibility * 0.15) +
                (source.alignment * 0.20);

            return {
                ...source,
                capitalScore:
                    Number(score.toFixed(2))
            };

        })
        .sort(
            (a,b) =>
            b.capitalScore -
            a.capitalScore
        );

}


module.exports = {
    getCapitalSources,
    prioritizeCapitalSources
};
