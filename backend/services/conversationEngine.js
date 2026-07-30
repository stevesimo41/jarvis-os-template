const orchestrator =
    require("./orchestrator");

const decisionHistory =
    require("./decisionHistoryEngine");

const workingMemory =
    require("./workingMemoryEngine");


function processMessage(message) {

    const result =
        orchestrator.process(message);


    workingMemory.updateWorkingMemory({

        lastConversation:
            message,

        lastIntent:
            result.memory?.intent || "COMPLETE",

        lastAgent:
            "JARVIS"

    });


    decisionHistory.recordDecision({

        type: "conversation",

        input: message,

        response:
            result.response

    });


    return {

        message,

        response:
            result.response,

        memory:
            result.memory

    };

}


module.exports = {

    processMessage

};
