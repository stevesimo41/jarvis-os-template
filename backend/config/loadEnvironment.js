const path = require("path");

require("dotenv").config({
    path: path.resolve(__dirname, "../.env")
});

if (process.env.JARVIS_SECRETS_PASSPHRASE) {
    const vault = require("../services/secretVaultService");
    const secrets = vault.load({ passphrase: process.env.JARVIS_SECRETS_PASSPHRASE });
    for (const [key, value] of Object.entries(secrets)) {
        process.env[key] = value;
    }
}
