const { XeroClient } = require("xero-node");
const { promisify } = require("util");
const Knex = require("../helpers/knex");
const { IS_DEV_TEST } = require("./booleans");

function customerIO(integration, method, ...rest) {
  let CIO = require("customerio-node");
  const cio = new CIO(integration.client_id, integration.client_secret);
  return cio;
}

module.exports = customerIO;
