const dependencyEngine = require("./dependencyEngine");

function getReadyTasks() {

    const tasks =
        dependencyEngine.evaluateDependencies();

    return tasks
        .filter(task =>
            !task.blocked &&
            task.status === "todo"
        )
        .sort((a, b) =>
            a.priority - b.priority
        );

}

module.exports = {
    getReadyTasks
};
