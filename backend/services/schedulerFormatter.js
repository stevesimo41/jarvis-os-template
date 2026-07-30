function formatSchedule(schedule) {

return `

JARVIS DAILY SCHEDULE

AVAILABLE HOURS:
${schedule.availableHours}

TODAY'S FOCUS:

${schedule.schedule.map((task, index) => 
`${index + 1}. ${task.title}
Category:
${task.category}

Hours Today:
${task.scheduledHours}

Remaining:
${task.remainingAfterToday} hours
`
).join("\n")}

`;

}


module.exports = {
    formatSchedule
};
