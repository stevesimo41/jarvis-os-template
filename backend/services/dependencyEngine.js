const taskEngine = require("./taskEngine");

function evaluateDependencies() {

    const tasks =
        taskEngine.getTasks().tasks;

    return tasks.map(task => {

        const blocked =
            task.dependsOn.some(dep => {

                const dependency =
                    tasks.find(t => t.id === dep);

                return (
                    dependency &&
                    dependency.status !== "completed"
                );

            });

        return {

            ...task,

            blocked

        };

    });

}

module.exports = {
    evaluateDependencies
};
