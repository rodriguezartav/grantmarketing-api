function sendGrid(integration = {}) {
  console.log("creating sendgrid connection");
  const client = require("@sendgrid/mail");
  client.setApiKey(integration.api_key || process.env.SEND_GRID_KEY);

  return client;
}

module.exports = sendGrid;
