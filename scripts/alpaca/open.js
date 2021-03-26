if (!process.env.NODE_ENV) require("dotenv").config();

const Knex = require("../../helpers/knex_pg");
const Alpaca = require("../../helpers/alpaca");
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
  const alpacaKeys = integrationMap["alpaca"];
  const knex = Knex(pgString);
  const alpaca = Alpaca(alpacaKeys, true); //PAPER!

  await alpaca.cancelAllOrders();
  await alpaca.closeAllPositions();

  const stocks = await knex.table("stocks").select().where("active", true);

  const promises = stocks.map(async (stock) => {
    let quote = await Alpaca.quote(alpacaKeys, stock.symbol);
    if (quote.last) {
      return await Alpaca.buyOrCry(alpacaKeys, {
        qty: stock.buy_amount,
        symbol: stock.symbol,
        price: (quote.last.ap + quote.last.bp) / 2,
      });
    } else return false;
  });

  await Promise.all(promises);

  return true;
}

module.exports = Run;
