if (!process.env.NODE_ENV) require("dotenv").config();

const Knex = require("../../helpers/knex_pg");
const Alpaca = require("../../helpers/alpaca");
const finnhub = require("../../helpers/finnhub");
const moment = require("moment-timezone");
moment.tz.setDefault("America/New_York");

const sms = require("../../helpers/sms");

async function Run(integrationMap, users, scriptOptions) {
  const pgString = integrationMap["postgres"];
  const alpacaKeys = integrationMap["alpaca"];
  const knex = Knex(pgString);
  const alpaca = Alpaca(alpacaKeys, true); //PAPER!

  const marketStatus = await Alpaca.marketStatus(alpacaKeys);
  if (!marketStatus.isOpen) return true;
  const orders = await alpaca.getOrders();
  let orderMap = {};
  orders.forEach((item) => {
    orderMap[item.symbol] = item;
  });

  const positions = await alpaca.getPositions();

  const stocks = await knex
    .table("stocks")
    .select()
    .whereNotIn(
      "symbol",
      positions.map((item) => item.symbol)
    );

  for (let index = 0; index < stocks.length; index++) {
    const stock = stocks[index];
    if (!orderMap[stock.symbol]) {
      await sms(`Buying ${position.symbol}`, "+50684191862");
      await Alpaca.order(alpacaKeys, "buy", "market", {
        qty: 5,
        symbol: stock.symbol,
      });
    }
  }
  return true;
}

module.exports = Run;

function formatPl(pl) {
  return parseInt(pl * 1000) / 10 + "%";
}
