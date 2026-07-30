function formatExecutiveBrief(brief) {

    let output = "";

    output += `Good morning ${brief.executive}.\n\n`;

    output += "EXECUTIVE SUMMARY\n\n";

    output += `${brief.mission}\n\n`;

    output += "PRIMARY PRIORITIES\n\n";

    brief.priorities.forEach((p, index) => {
        output += `${index + 1}. ${p.priority}\n`;
        output += `Status: ${p.status}\n`;
        output += `Objective: ${p.objective}\n\n`;
    });

    output += "VENTURE STATUS\n\n";

    brief.ventures.forEach(v => {
        output += `${v.name}\n`;
        output += `Status: ${v.status}\n`;
        output += `Current Focus: ${v.focus}\n\n`;
    });

    output += "RECOMMENDATION\n\n";

    output += brief.recommendation;

    return output;
}

module.exports = {
    formatExecutiveBrief
};
