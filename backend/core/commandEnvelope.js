const crypto = require("crypto");

function createCommandEnvelope({
  command,
  source = "ui",
  user = "owner",
  venture = null,
  context = {},
  metadata = {}
} = {}) {
  return {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    command,
    source,
    user,
    venture,
    context,
    metadata,
    status: "received"
  };
}

module.exports = {
  createCommandEnvelope
};
