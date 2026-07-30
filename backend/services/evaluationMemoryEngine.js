const fs = require("fs");
const path = require("path");


const evaluationPath =
    path.join(
        __dirname,
        "../memory/history/evaluations.json"
    );


function getEvaluations() {

    if (!fs.existsSync(evaluationPath)) {

        return [];

    }


    return JSON.parse(
        fs.readFileSync(
            evaluationPath,
            "utf8"
        )
    );

}


function saveEvaluation(evaluation) {

    const evaluations =
        getEvaluations();


    evaluations.push(evaluation);


    fs.writeFileSync(
        evaluationPath,
        JSON.stringify(
            evaluations,
            null,
            2
        )
    );


    return evaluation;

}


function getRecentEvaluations(limit = 10) {

    const evaluations =
        getEvaluations();


    return evaluations.slice(-limit);

}


module.exports = {

    saveEvaluation,

    getRecentEvaluations

};
