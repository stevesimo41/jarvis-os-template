const outcomeEngine =
    require("./outcomeEngine");

const memoryIntelligence =
    require("./memoryIntelligence");

const workingMemory =
    require("./workingMemoryEngine");


function generateReflection() {


    const outcomes =
        outcomeEngine.getRecentOutcomes(5);


    const intelligence =
        memoryIntelligence.analyzeMemory();


    const working =
        workingMemory.getCurrentTask();


    if (outcomes.length === 0) {

        return {

            reflection:
                "No execution history available.",

                lesson:
    intelligence.learning,

        };

    }


    const latest =
        outcomes[outcomes.length - 1];


    return {

        currentTask:
            working.currentTask,

        latestOutcome:
            latest.outcome,

        reflection:
    "Recent execution demonstrates that JARVIS can complete prioritized actions and transition toward the next objective.",

        nextFocus:
            working.nextAction

    };

}


module.exports = {

    generateReflection

};
