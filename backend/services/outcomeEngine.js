const fs = require("fs");
const path = require("path");

const outcomePath = path.join(
    __dirname,
    "../memory/history/outcomes.json"
);


function getOutcomes() {

    if (!fs.existsSync(outcomePath)) {

        return {
            outcomes: []
        };

    }

    return JSON.parse(
        fs.readFileSync(
            outcomePath,
            "utf8"
        )
    );

}


function saveOutcome(outcome) {

    const memory =
        getOutcomes();

    memory.outcomes.push({

        timestamp:
            new Date().toISOString(),

        outcome

    });


    fs.writeFileSync(
        outcomePath,
        JSON.stringify(memory,null,2)
    );

}


function getRecentOutcomes(limit = 10) {

    const memory =
        getOutcomes();

    return memory.outcomes.slice(-limit);

}


module.exports = {

    saveOutcome,

    getRecentOutcomes

};
