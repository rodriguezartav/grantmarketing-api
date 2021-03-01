function customerIO(integration) {
  console.log("creating customerio connection");
  let CIO = require("customerio-node");
  const cio = new CIO(integration.client_id, integration.client_secret);
  return cio;
}

module.exports = customerIO;
