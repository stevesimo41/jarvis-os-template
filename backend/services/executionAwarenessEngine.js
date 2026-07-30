const executionManager =
    require("./executionManager");

const outcomeEngine =
    require("./outcomeEngine");

const workingMemory =
    require("./workingMemoryEngine");


function analyzeExecution() {


    const execution =
        executionManager.readExecution();


    const outcomes =
        outcomeEngine.getRecentOutcomes();


    const working =
        workingMemory.getCurrentTask();


    if (!execution.activeTask) {

        return {

            status:
                "NO_ACTIVE_TASK",

            recommendation:
                "Select next priority."

        };

    }


    const started =
        new Date(execution.started);


    const now =
        new Date();


    const ageHours =
        Number(
            (
                (now - started)
                /
                1000
                /
                60
                /
                60
            ).toFixed(2)
        );


    let health =
        "HEALTHY";


    if (ageHours > 24) {

        health =
            "NEEDS_ATTENTION";

    }


    if (ageHours > 72) {

        health =
            "STALLED";

    }


    return {

        task:
            execution.activeTask,

        venture:
            execution.venture,

        assignedAgent:
            execution.assignedAgent,

        status:
            execution.status,

        ageHours,

        health,

        workingMemory:
            working.currentTask,

        completedHistory:
            outcomes.length,

        recommendation:
            generateRecommendation(
                health,
                execution.activeTask
            )

    };

}


function generateRecommendation(
    health,
    task
) {


    if (health === "STALLED") {

        return (
            "Break " +
            task +
            " into smaller execution steps."
        );

    }


    if (health === "NEEDS_ATTENTION") {

        return (
            "Review progress on " +
            task
        );

    }


    return (
        "Continue execution on " +
        task
    );

}


module.exports = {

    analyzeExecution

};
