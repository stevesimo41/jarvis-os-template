const fs = require("fs");
const path = require("path");


const decisionPath =
    path.join(
        __dirname,
        "../memory/history/decisions.json"
    );


function getDecisions() {

    if (!fs.existsSync(decisionPath)) {

        return {
            decision_history: []
        };

    }


    const data =
        JSON.parse(
            fs.readFileSync(
                decisionPath,
                "utf8"
            )
        );


    if (Array.isArray(data)) {

        return {
            decision_history: data
        };

    }


    return data;

}


function recordDecision(decision) {

    const memory =
        getDecisions();


    memory.decision_history.push({

        timestamp:
            new Date().toISOString(),

        decision

    });


    fs.writeFileSync(
        decisionPath,
        JSON.stringify(
            memory,
            null,
            2
        )
    );


    return decision;

}


function getRecentDecisions(limit = 10) {

    const memory =
        getDecisions();


    return memory.decision_history.slice(-limit);

}


module.exports = {

    recordDecision,

    getRecentDecisions

};
