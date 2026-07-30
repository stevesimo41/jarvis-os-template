const vault = require("../services/secretVaultService");

const command = process.argv[2];
const passphrase = process.env.JARVIS_SECRETS_PASSPHRASE;

try {
    if (command === "import-env") {
        const result = vault.importEnvironment({ passphrase });
        console.log(`Encrypted secrets vault updated: ${result.path}`);
        console.log(`Stored keys: ${result.keys.join(", ") || "none"}`);
        console.error("After verifying startup with the vault, remove imported plaintext secrets from backend/.env.");
    } else if (command === "list") {
        const values = vault.load({ passphrase });
        console.log(`Configured vault keys: ${Object.keys(values).sort().join(", ") || "none"}`);
    } else {
        throw new Error("Use: secrets.js import-env | list");
    }
} catch (error) {
    console.error(`Secrets operation failed: ${error.message}`);
    process.exitCode = 1;
}
