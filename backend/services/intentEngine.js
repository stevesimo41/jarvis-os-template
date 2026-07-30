function detectIntent(input) {

    const text = input.toLowerCase();

    if (
        text.includes("goal") ||
        text.includes("priority") ||
        text.includes("mission")
    ) {

        return "GOALS";

    }

    if (
        text.includes("capital") ||
        text.includes("investor") ||
        text.includes("funding")
    ) {

        return "CAPITAL";

    }

    if (
        text.includes("research") ||
        text.includes("learn") ||
        text.includes("market")
    ) {

        return "RESEARCH";

    }

    if (
        text.includes("opportunity") ||
        text.includes("business")
    ) {

        return "OPPORTUNITIES";

    }

    if (
        text.includes("task") ||
        text.includes("schedule") ||
        text.includes("today")
    ) {

        return "EXECUTION";

    }

    if (
        text.includes("memory") ||
        text.includes("remember")
    ) {

        return "MEMORY";

    }

    if (
        text.includes("executive brief") ||
        text.includes("brief")
    ) {

        return "EXECUTIVE";

    }

    return "GENERAL";

}

module.exports = {

    detectIntent

};
