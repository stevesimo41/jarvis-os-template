const fs = require("fs");
const path = require("path");

function getMemory(file) {

    const memoryPath = path.join(
        __dirname,
        "../../memory",
        file
    );

    if (!fs.existsSync(memoryPath)) {
        return null;
    }

    return JSON.parse(
        fs.readFileSync(memoryPath, "utf8")
    );

}


function getExecutiveContext() {

    return {
        profile: getMemory("profile.json"),
        priorities: getMemory("priorities.json"),
        ventures: getMemory("avos.json"),
        executive: getMemory("context/executive.json"),
decisions: getMemory("context/decisions.json")
    };

}


module.exports = {
    getMemory,
    getExecutiveContext
};
