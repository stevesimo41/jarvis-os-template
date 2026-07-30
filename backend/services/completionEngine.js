const executionManager =
    require("./executionManager");

const taskEngine =
    require("./taskEngine");

const outcomeEngine =
    require("./outcomeEngine");

const workingMemory =
    require("./workingMemoryEngine");


function completeCurrentTask() {


    const execution =
        executionManager.readExecution();


    if (!execution.activeTask) {

        return {
            status:
                "no_active_task"
        };

    }


    const database =
        taskEngine.getTasks();


    const task =
    database.tasks.find(
        t =>
            t.title.toLowerCase()
            .includes(
                execution.activeTask.toLowerCase()
            )
            ||
            execution.activeTask.toLowerCase()
            .includes(
                t.title.toLowerCase()
            )
    );


    if (task) {

        task.status =
            "completed";

    }


    taskEngine.saveTasks(database);


    executionManager.completeTask();


    outcomeEngine.saveOutcome({

        task:
            execution.activeTask,

        result:
            "completed",

        venture:
            execution.venture

    });


    const next =
    taskEngine
        .prioritizeTasks()[0];


if (next) {

    executionManager.startTask({

        title:
            next.title,

        owner:
            "JARVIS",

        venture:
            next.category

    });

}


workingMemory.updateWorkingMemory({

    currentTask:
        next
        ? next.title
        : "No active task",

    nextAction:
        next
        ? next.title
        : "Review priorities"

});



    return {

        completed:
            execution.activeTask,

        nextTask:
            next
            ? next.title
            : null

    };

}


module.exports = {

    completeCurrentTask

};
