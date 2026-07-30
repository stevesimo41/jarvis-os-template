const fs = require("fs");
const path = require("path");

const tasksPath = path.join(
    __dirname,
    "../memory/context/tasks.json"
);


function getTasks() {

    return JSON.parse(
        fs.readFileSync(tasksPath, "utf8")
    );

}


function saveTasks(database) {

    fs.writeFileSync(
        tasksPath,
        JSON.stringify(database, null, 2)
    );

    return database;

}


function prioritizeTasks() {

    const tasks =
        getTasks().tasks;

    return tasks
        .filter(t => t.status !== "completed")
        .sort((a, b) =>
            a.priority - b.priority
        );

}


function completeTask(id) {

    const database =
        getTasks();

    const task =
        database.tasks.find(
            t => t.id === id
        );

    if (task) {

        task.status =
            "completed";

    }

    saveTasks(database);

    return task;

}


module.exports = {

    getTasks,

    saveTasks,

    prioritizeTasks,

    completeTask

};
