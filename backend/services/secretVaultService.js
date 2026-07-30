const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { writeJsonAtomic } = require("../storage/atomicJsonStore");

const FORMAT = "jarvis-secret-vault-v1";
const SECRET_KEYS = [
    "JARVIS_OWNER_TOKEN",
    "JARVIS_OPERATOR_TOKEN",
    "JARVIS_VIEWER_TOKEN",
    "OPENAI_API_KEY",
    "JARVIS_BACKUP_PASSPHRASE",
    "LEMON_SQUEEZY_API_KEY",
    "LEMON_SQUEEZY_WEBHOOK_SECRET"
];

function vaultPath() {
    return path.resolve(
        String(process.env.JARVIS_SECRETS_PATH || "~/.jarvis/secrets.enc.json")
            .replace(/^~(?=$|\/)/, os.homedir())
    );
}

function assertPassphrase(passphrase) {
    if (String(passphrase || "").length < 16) {
        throw new Error("Secrets passphrase must contain at least 16 characters.");
    }
}

function encrypt(secrets, passphrase) {
    assertPassphrase(passphrase);
    const salt = crypto.randomBytes(16);
    const iv = crypto.randomBytes(12);
    const key = crypto.scryptSync(passphrase, salt, 32);
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
    const ciphertext = Buffer.concat([
        cipher.update(JSON.stringify(secrets), "utf8"),
        cipher.final()
    ]);
    return {
        format: FORMAT,
        updatedAt: new Date().toISOString(),
        salt: salt.toString("base64"),
        iv: iv.toString("base64"),
        tag: cipher.getAuthTag().toString("base64"),
        ciphertext: ciphertext.toString("base64")
    };
}

function decrypt(envelope, passphrase) {
    assertPassphrase(passphrase);
    if (envelope?.format !== FORMAT) throw new Error("Unsupported secrets vault format.");
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
    return JSON.parse(Buffer.concat([
        decipher.update(Buffer.from(envelope.ciphertext, "base64")),
        decipher.final()
    ]).toString("utf8"));
}

function save(secrets, options = {}) {
    const filePath = options.path || vaultPath();
    const allowed = Object.fromEntries(
        Object.entries(secrets).filter(([key, value]) =>
            SECRET_KEYS.includes(key) && typeof value === "string" && value
        )
    );
    writeJsonAtomic(filePath, encrypt(allowed, options.passphrase));
    fs.chmodSync(filePath, 0o600);
    return { path: filePath, keys: Object.keys(allowed).sort() };
}

function load(options = {}) {
    const filePath = options.path || vaultPath();
    if (!fs.existsSync(filePath)) return {};
    return decrypt(
        JSON.parse(fs.readFileSync(filePath, "utf8")),
        options.passphrase
    );
}

function importEnvironment(options = {}) {
    return save(
        Object.fromEntries(SECRET_KEYS.map(key => [key, process.env[key] || ""])),
        options
    );
}

module.exports = {
    SECRET_KEYS,
    decrypt,
    encrypt,
    importEnvironment,
    load,
    save,
    vaultPath
};
