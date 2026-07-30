const fs = require("fs");
const path = require("path");

const CORE_PATH = __dirname;

function ensureFile(name, initialValue) {

    const file =
        path.join(CORE_PATH, name);

    if (!fs.existsSync(file)) {

        fs.writeFileSync(
            file,
            JSON.stringify(initialValue, null, 2)
        );

    }

    return file;

}

const shortTermFile =
    ensureFile(
        "shortTerm.json",
        []
    );

const longTermFile =
    ensureFile(
        "longTerm.json",
        {}
    );

const episodicFile =
    ensureFile(
        "episodic.json",
        []
    );

const semanticFile =
    ensureFile(
        "semantic.json",
        {}
    );

const workingFile =
    ensureFile(
        "working.json",
        {}
    );

function read(file) {

    return JSON.parse(
        fs.readFileSync(file, "utf8")
    );

}

function write(file, data) {

    fs.writeFileSync(
        file,
        JSON.stringify(data, null, 2)
    );

}

module.exports = {

    readShortTerm: () => read(shortTermFile),
    writeShortTerm: data => write(shortTermFile, data),

    readLongTerm: () => read(longTermFile),
    writeLongTerm: data => write(longTermFile, data),

    readEpisodic: () => read(episodicFile),
    writeEpisodic: data => write(episodicFile, data),

    readSemantic: () => read(semanticFile),
    writeSemantic: data => write(semanticFile, data),

    readWorking: () => read(workingFile),
    writeWorking: data => write(workingFile, data)

};
