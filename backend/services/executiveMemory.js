const fs = require("fs");
const path = require("path");

const memoryPath = path.join(
    __dirname,
    "../memory/history/executiveBriefs.json"
);


function getMemory() {

    const data =
        fs.readFileSync(
            memoryPath,
            "utf8"
        );

    return JSON.parse(data);

}


function saveBrief(brief) {

    const memory =
        getMemory();

    memory.briefs.push({
        timestamp:
            new Date().toISOString(),
        brief
    });


    fs.writeFileSync(
        memoryPath,
        JSON.stringify(
            memory,
            null,
            2
        )
    );

    return true;

}


function getLatestBrief() {

    const memory =
        getMemory();

    if(memory.briefs.length === 0){
        return null;
    }

    return memory.briefs[
        memory.briefs.length - 1
    ];

}


module.exports = {
    getMemory,
    saveBrief,
    getLatestBrief
};
