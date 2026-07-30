const executionEngine = require("./executionEngine");

function buildSchedule(availableHours = 8) {

    const readyTasks =
        executionEngine.getReadyTasks();

    let remainingHours =
        availableHours;

    const schedule = [];

    for (const task of readyTasks) {

        if (remainingHours <= 0) {
            break;
        }

        const scheduledHours =
            Math.min(task.estimatedHours, remainingHours);

        schedule.push({

            title: task.title,

            category: task.category,

            scheduledHours,

            remainingAfterToday:
                task.estimatedHours - scheduledHours

        });

        remainingHours -= scheduledHours;

    }

    return {

        availableHours,

        remainingHours,

        schedule

    };

}

module.exports = {
    buildSchedule
};
