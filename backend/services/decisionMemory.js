const fs = require("fs");
const path = require("path");

const historyPath = path.join(
    __dirname,
    "../memory/history/decisions.json"
);

function saveDecision(decision) {

    const data = JSON.parse(
        fs.readFileSync(historyPath, "utf8")
    );

    data.decision_history.push({
        timestamp: new Date().toISOString(),
        ...decision
    });

    fs.writeFileSync(
        historyPath,
        JSON.stringify(data, null, 2)
    );

    return decision;
}


function getDecisionHistory() {

    const data = JSON.parse(
        fs.readFileSync(historyPath, "utf8")
    );

    return data.decision_history;
}


module.exports = {
    saveDecision,
    getDecisionHistory
};
