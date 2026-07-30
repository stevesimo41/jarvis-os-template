const taskEngine =
    require("./taskEngine");

function getNextAction() {

    const tasks =
    taskEngine.getTasks().tasks;


const active =
    tasks.find(
        task =>
            task.status === "active"
    );

    if (active) {

        return {
            type: "ACTIVE",
            task: active
        };

    }

    const ready =
    taskEngine
        .prioritizeTasks()
        .filter(
            task =>
                task.status === "todo"
        );

    if (ready.length > 0) {

        return {
            type: "READY",
            task: ready[0]
        };

    }

    return {
        type: "NONE",
        task: null
    };

}

module.exports = {

    getNextAction

};
