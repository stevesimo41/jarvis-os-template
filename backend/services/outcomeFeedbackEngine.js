const outcomeEngine =
    require("./outcomeEngine");


function recordOutcome(outcome) {

    return outcomeEngine.saveOutcome(
        outcome
    );

}


function getOutcomes() {

    return outcomeEngine.getRecentOutcomes();

}


module.exports = {

    recordOutcome,

    getOutcomes

};
