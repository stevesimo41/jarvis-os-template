const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { writeJsonAtomic } = require("../storage/atomicJsonStore");

const FORMAT = "jarvis-encrypted-backup-v1";
const MAX_BACKUP_BYTES = 50 * 1024 * 1024;

function assertPassphrase(passphrase) {
    if (String(passphrase || "").length < 16) {
        throw new Error("Backup passphrase must contain at least 16 characters.");
    }
}

function filesUnder(root, base) {
    if (!fs.existsSync(root)) return [];
    return fs.readdirSync(root, { withFileTypes: true }).flatMap(entry => {
        const absolute = path.join(root, entry.name);
        if (entry.isSymbolicLink()) return [];
        if (entry.isDirectory()) return filesUnder(absolute, base);
        if (!entry.isFile()) return [];
        return [{
            path: path.relative(base, absolute),
            mode: fs.statSync(absolute).mode & 0o777,
            data: fs.readFileSync(absolute).toString("base64")
        }];
    });
}

function defaultRoots(repoRoot) {
    return [
        path.join(repoRoot, "backend/data"),
        path.join(repoRoot, "backend/memory"),
        path.join(repoRoot, "memory")
    ];
}

function encryptPayload(payload, passphrase) {
    assertPassphrase(passphrase);
    const salt = crypto.randomBytes(16);
    const iv = crypto.randomBytes(12);
    const key = crypto.scryptSync(passphrase, salt, 32);
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
    const plaintext = Buffer.from(JSON.stringify(payload));
    const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    return {
        format: FORMAT,
        createdAt: new Date().toISOString(),
        algorithm: "aes-256-gcm+scrypt",
        salt: salt.toString("base64"),
        iv: iv.toString("base64"),
        tag: cipher.getAuthTag().toString("base64"),
        digest: crypto.createHash("sha256").update(plaintext).digest("hex"),
        ciphertext: ciphertext.toString("base64")
    };
}

function decryptEnvelope(envelope, passphrase) {
    assertPassphrase(passphrase);
    if (envelope?.format !== FORMAT) throw new Error("Unsupported backup format.");
    const key = crypto.scryptSync(
        passphrase,
        Buffer.from(envelope.salt, "base64"),
        32
    );
    const decipher = crypto.createDecipheriv(
        "aes-256-gcm",
        key,
        Buffer.from(envelope.iv, "base64")
    );
    decipher.setAuthTag(Buffer.from(envelope.tag, "base64"));
    const plaintext = Buffer.concat([
        decipher.update(Buffer.from(envelope.ciphertext, "base64")),
        decipher.final()
    ]);
    const digest = crypto.createHash("sha256").update(plaintext).digest("hex");
    if (digest !== envelope.digest) throw new Error("Backup integrity verification failed.");
    return JSON.parse(plaintext.toString("utf8"));
}

function create(options) {
    const repoRoot = path.resolve(options.repoRoot);
    const roots = options.roots || defaultRoots(repoRoot);
    const files = roots.flatMap(root => filesUnder(root, repoRoot));
    const bytes = files.reduce((total, file) =>
        total + Buffer.byteLength(file.data, "base64"), 0);
    if (bytes > MAX_BACKUP_BYTES) throw new Error("Backup exceeds the 50 MB safety limit.");
    const payload = {
        format: FORMAT,
        createdAt: new Date().toISOString(),
        files
    };
    const envelope = encryptPayload(payload, options.passphrase);
    writeJsonAtomic(path.resolve(options.outputPath), envelope);
    fs.chmodSync(path.resolve(options.outputPath), 0o600);
    return { files: files.length, bytes, digest: envelope.digest };
}

function verify(options) {
    const envelope = JSON.parse(fs.readFileSync(options.backupPath, "utf8"));
    const payload = decryptEnvelope(envelope, options.passphrase);
    return {
        files: payload.files.length,
        createdAt: payload.createdAt,
        digest: envelope.digest
    };
}

function safeDestination(targetRoot, relativePath) {
    const root = path.resolve(targetRoot);
    const destination = path.resolve(root, relativePath);
    if (!destination.startsWith(`${root}${path.sep}`)) {
        throw new Error("Backup contains an unsafe path.");
    }
    return destination;
}

function restore(options) {
    if (options.confirm !== "RESTORE") {
        throw new Error("Restore requires exact confirmation RESTORE.");
    }
    const envelope = JSON.parse(fs.readFileSync(options.backupPath, "utf8"));
    const payload = decryptEnvelope(envelope, options.passphrase);
    for (const file of payload.files) {
        const destination = safeDestination(options.targetRoot, file.path);
        fs.mkdirSync(path.dirname(destination), { recursive: true });
        const temporary = `${destination}.${crypto.randomUUID()}.restore`;
        fs.writeFileSync(temporary, Buffer.from(file.data, "base64"), { mode: 0o600 });
        fs.renameSync(temporary, destination);
        fs.chmodSync(destination, Math.min(file.mode || 0o600, 0o600));
    }
    return { files: payload.files.length, digest: envelope.digest };
}

module.exports = {
    create,
    decryptEnvelope,
    encryptPayload,
    restore,
    verify
};
