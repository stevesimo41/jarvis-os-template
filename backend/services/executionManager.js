const fs = require("fs");
const path = require("path");

const executionPath =
    path.join(
        __dirname,
        "../memory/core/execution.json"
    );

const tasksPath =
    path.join(
        __dirname,
        "../memory/context/tasks.json"
    );

function readExecution() {

    return JSON.parse(
        fs.readFileSync(
            executionPath,
            "utf8"
        )
    );

}

function activateTask(title) {

    const database =
        JSON.parse(
            fs.readFileSync(
                tasksPath,
                "utf8"
            )
        );


    const task =
        database.tasks.find(
            t =>
                t.title === title
        );


    if (task) {

        task.status =
            "active";

    }


    fs.writeFileSync(
        tasksPath,
        JSON.stringify(
            database,
            null,
            2
        )
    );


    return task;

}

function startTask(task) {
activateTask(task.title);

    const execution = {

        activeTask:
            task.title,

        assignedAgent:
            task.owner || "JARVIS",

        venture:
            task.venture || "JARVIS OS",

        status:
            "in_progress",

        started:
            new Date().toISOString(),

        completed:
            "",

        lastUpdate:
            new Date().toISOString()

    };


    fs.writeFileSync(
        executionPath,
        JSON.stringify(
            execution,
            null,
            2
        )
    );


    return execution;

}


function completeTask() {

    const execution =
        readExecution();


    execution.status =
        "completed";

    execution.completed =
        new Date().toISOString();

    execution.lastUpdate =
        new Date().toISOString();


    fs.writeFileSync(
        executionPath,
        JSON.stringify(
            execution,
            null,
            2
        )
    );


    return execution;

}


module.exports = {

    readExecution,

    startTask,

    completeTask,

    activateTask

};
