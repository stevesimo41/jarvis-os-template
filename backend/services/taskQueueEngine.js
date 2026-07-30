const taskEngine =
    require("./taskEngine");

const dependencyEngine =
    require("./dependencyEngine");


function getTasks() {

    return taskEngine
        .getTasks()
        .tasks;

}


function getActiveTask() {

    return getTasks().find(
        task =>
            task.status === "active"
    );

}


function getReadyTasks() {

    const tasks =
        dependencyEngine
            .evaluateDependencies();

    return tasks
        .filter(task =>
            !task.blocked &&
            (
                task.status === "todo" ||
                task.status === "ready"
            )
        )
        .sort(
            (a, b) =>
                a.priority - b.priority
        );

}


module.exports = {

    getTasks,

    getActiveTask,

    getReadyTasks

};
