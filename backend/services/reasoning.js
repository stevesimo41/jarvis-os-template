const memory =
    require("../memory/memoryEngine");

const workingMemory =
    require("./workingMemoryEngine");


function generateExecutiveBrief() {

    const context =
        memory.getExecutiveContext();


    const working =
        workingMemory.getCurrentTask();


    return {

        executive:
            context.profile.name,

        role:
            context.profile.role,

        mission:
            context.profile.mission,


        priorities:
            context.priorities.current_priorities,


        ventures:
            context.ventures.ventures.map(v => ({

                name:
                    v.name,

                status:
                    v.status,

                focus:
                    v.current_focus[0]

            })),


        currentExecution: {

            task:
                working.currentTask,

            agent:
                working.currentAgent,

            venture:
                working.currentVenture,

            nextAction:
                working.nextAction

        },


        recommendation:
            "Continue building JARVIS OS first because it increases leverage across every other venture while maintaining the current execution focus."

    };

}


module.exports = {

    generateExecutiveBrief

};
