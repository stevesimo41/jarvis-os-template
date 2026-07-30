function formatExecutionStatus(execution) {

    if (!execution.activeTask) {

        return `
STEVE, NO ACTIVE EXECUTION IS CURRENTLY RUNNING.
`;

    }


    return `

CURRENT EXECUTION STATUS

Task:
${execution.activeTask}

Assigned Agent:
${execution.assignedAgent}

Venture:
${execution.venture}

Status:
${execution.status}

Started:
${execution.started}

`;

}


module.exports = {

    formatExecutionStatus

};
