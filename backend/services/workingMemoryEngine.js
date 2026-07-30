const memory =
    require("../memory/core/memoryManager");


function updateWorkingMemory(updates) {

    const current =
        memory.readWorking();


    const updated = {

        ...current,

        ...updates,

        updated:
            new Date().toISOString()

    };


    memory.writeWorking(updated);


    return updated;

}


function getCurrentTask() {

    return memory.readWorking();

}


function setCurrentTask(task) {

    return updateWorkingMemory({

        currentTask: task

    });

}


module.exports = {

    updateWorkingMemory,

    setCurrentTask,

    getCurrentTask

};
