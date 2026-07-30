const crypto = require("crypto");

for (const role of ["OWNER", "OPERATOR", "VIEWER"]) {
    console.log(`JARVIS_${role}_TOKEN=${crypto.randomBytes(32).toString("base64url")}`);
}
console.error("Replace all three values together in backend/.env, restart JARVIS, then revoke existing sessions.");
