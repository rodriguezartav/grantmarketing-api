function sendGrid(integration) {
  const client = require("@sendgrid/client");
  client.setApiKey(integration.api_key);

  return client;
}

module.exports = sendGrid;
