if (!process.env.NODE_ENV) require("dotenv").config();

const Knex = require("../../helpers/knex_pg");
const Kraken = require("../../helpers/kraken");
const finnhub = require("../../helpers/finnhub");
const moment = require("moment");
const position = require("@alpacahq/alpaca-trade-api/lib/resources/position");
const sms = require("../../helpers/sms");

const {
  QueryInstance,
} = require("twilio/lib/rest/autopilot/v1/assistant/query");
const { quote } = require("../../helpers/alpaca");

async function Run(integrationMap, users, scriptOptions) {
  const pgString = integrationMap["postgres"];

  const knex = Knex(pgString);
  const kraken = Kraken(integrationMap["kraken"]);

  const balance = await kraken.api("OHLC", { pair: "ETHUSD", interval: 5 });
  console.log(balance);

  await sms(balance.result["XETHZUSD"][0][4], "whatsapp:+50684191862");

  return true;
}

module.exports = Run;
