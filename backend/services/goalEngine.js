const fs = require("fs");
const path = require("path");

const goalsPath = path.join(
    __dirname,
    "../memory/context/goals.json"
);

function getGoals() {

    const data = fs.readFileSync(
        goalsPath,
        "utf8"
    );

    return JSON.parse(data);
}

function prioritizeGoals() {

    const goals = getGoals().goals;

    return goals
        .map(goal => {

            const opportunityGap =
                100 - goal.progress;

            const score =
                (goal.priority * 0.40) +
                (goal.missionAlignment * 0.25) +
                (goal.leverage * 0.20) +
                ((opportunityGap / 10) * 0.15);

            return {
                ...goal,
                executiveScore:
                    Number(score.toFixed(2))
            };

        })
        .sort(
            (a,b) =>
            b.executiveScore -
            a.executiveScore
        );
}


module.exports = {
    getGoals,
    prioritizeGoals
};
