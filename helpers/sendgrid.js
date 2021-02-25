function sendGrid(integration) {
  const client = require("@sendgrid/mail");
  client.setApiKey(integration.api_key);

  return client;
}

module.exports = sendGrid;
