const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

function readJson(filePath, fallback) {
    if (!fs.existsSync(filePath)) {
        return fallback;
    }

    const contents = fs.readFileSync(filePath, "utf8").trim();
    return contents ? JSON.parse(contents) : fallback;
}

function writeJsonAtomic(filePath, value) {
    const directory = path.dirname(filePath);
    fs.mkdirSync(directory, { recursive: true });

    const temporaryPath = path.join(
        directory,
        `.${path.basename(filePath)}.${process.pid}.${crypto.randomUUID()}.tmp`
    );

    try {
        const descriptor = fs.openSync(temporaryPath, "wx", 0o600);

        try {
            fs.writeFileSync(
                descriptor,
                `${JSON.stringify(value, null, 2)}\n`,
                "utf8"
            );
            fs.fsyncSync(descriptor);
        } finally {
            fs.closeSync(descriptor);
        }

        fs.renameSync(temporaryPath, filePath);

        const directoryDescriptor = fs.openSync(directory, "r");
        try {
            fs.fsyncSync(directoryDescriptor);
        } finally {
            fs.closeSync(directoryDescriptor);
        }
    } finally {
        if (fs.existsSync(temporaryPath)) {
            fs.unlinkSync(temporaryPath);
        }
    }

    return value;
}

module.exports = {
    readJson,
    writeJsonAtomic
};
