const path = require("path");
const backup = require("../services/encryptedBackupService");

const [command, fileArgument, confirmation] = process.argv.slice(2);
const repoRoot = path.resolve(__dirname, "../..");
const passphrase = process.env.JARVIS_BACKUP_PASSPHRASE;

function defaultBackupPath() {
    const stamp = new Date().toISOString().replaceAll(":", "-");
    return path.join(repoRoot, "backups", `jarvis-${stamp}.backup.json`);
}

try {
    if (command === "create") {
        const outputPath = path.resolve(fileArgument || defaultBackupPath());
        const result = backup.create({ repoRoot, outputPath, passphrase });
        console.log(`Encrypted backup created: ${outputPath}`);
        console.log(`Files: ${result.files}; bytes: ${result.bytes}; digest: ${result.digest}`);
    } else if (command === "verify") {
        if (!fileArgument) throw new Error("Backup path is required.");
        const result = backup.verify({ backupPath: path.resolve(fileArgument), passphrase });
        console.log(`Backup verified: ${result.files} files; digest: ${result.digest}`);
    } else if (command === "restore") {
        if (!fileArgument) throw new Error("Backup path is required.");
        const result = backup.restore({
            backupPath: path.resolve(fileArgument),
            targetRoot: repoRoot,
            passphrase,
            confirm: confirmation
        });
        console.log(`Backup restored: ${result.files} files; digest: ${result.digest}`);
    } else {
        throw new Error("Use: backup.js create [path] | verify <path> | restore <path> RESTORE");
    }
} catch (error) {
    console.error(`Backup operation failed: ${error.message}`);
    process.exitCode = 1;
}
