const request = require("superagent");
const CryptoJS = require("crypto-js");
const KrakenClient = require("kraken-api");

module.exports = function Kraken(integration) {
  const key = integration.client_id;
  const secret = integration.client_secret;

  return new KrakenClient(key, secret);
};
