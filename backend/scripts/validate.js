const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const roots = ["agents", "auth", "config", "core", "crm", "governance", "http", "prospecting", "providers", "repositories", "research", "routes", "services", "storage", "workflows", "server.js", "../frontend"];
const failures = [];
let checked = 0;

function filesAt(target) {
    const absolute = path.resolve(__dirname, "..", target);

    if (!fs.existsSync(absolute)) {
        return [];
    }

    if (fs.statSync(absolute).isFile()) {
        return absolute.endsWith(".js") ? [absolute] : [];
    }

    return fs.readdirSync(absolute, { withFileTypes: true })
        .flatMap(entry => filesAt(path.join(target, entry.name)));
}

for (const file of roots.flatMap(filesAt)) {
    const result = spawnSync(process.execPath, ["--check", file], {
        encoding: "utf8"
    });
    checked += 1;

    if (result.status !== 0) {
        failures.push(`${path.relative(process.cwd(), file)}\n${result.stderr.trim()}`);
    }
}

if (failures.length) {
    console.error(failures.join("\n\n"));
    process.exit(1);
}

console.log(`Validated JavaScript syntax in ${checked} backend and frontend files.`);
