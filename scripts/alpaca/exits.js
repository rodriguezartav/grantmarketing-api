if (!process.env.NODE_ENV) require("dotenv").config();

const Knex = require("../../helpers/knex_pg");
const Alpaca = require("../../helpers/alpaca");
const finnhub = require("../../helpers/finnhub");
const moment = require("moment-timezone");

const sms = require("../../helpers/sms");
moment.tz.setDefault("America/New_York");

async function Run(integrationMap, users, scriptOptions) {
  const pgString = integrationMap["postgres"];
  const alpacaKeys = integrationMap["alpaca"];
  const knex = Knex(pgString);
  const alpaca = Alpaca(alpacaKeys, true); //PAPER!

  const marketStatus = await Alpaca.marketStatus(alpacaKeys);
  if (!marketStatus.isOpen && !marketStatus.afterHours) return true;
  const positions = await alpaca.getPositions();
  const orders = await alpaca.getOrders();

  if (positions.length == 0) return true;

  const stocks = await knex.table("stocks").select();

  let positionsMap = {};
  positions.forEach((item) => {
    item.current_price = parseFloat(item.current_price);
    item.avg_entry_price = parseFloat(item.avg_entry_price);
    item.unrealized_plpc = parseFloat(item.unrealized_plpc);
    positionsMap[item.symbol] = item;
  });

  let orderMap = {};
  orders.forEach((item) => {
    orderMap[item.symbol] = item;
  });

  for (let index = 0; index < stocks.length; index++) {
    const stock = stocks[index];
    const position = positionsMap[stock.symbol];
    const order = orderMap[stock.symbol];

    if (!position || order) return;
    const bars = await knex
      .table("bars")
      .where("symbol", stock.symbol)
      .where("time", ">", moment().startOf("day").unix())
      .orderBy("time", "DESC");

    const plMax = await knex
      .table("unrealized_profits")
      .max("plpc")
      .where("symbol", stock.symbol)
      .where("time", ">", moment().add(-1, "days").startOf("day").unix());

    let maxPl = 0;
    maxPl = plMax[0] && plMax[0].max;
    const minMaxPl = maxPl - 0.015;

    // close position
    if (position.unrealized_plpc <= minMaxPl)
      await Alpaca.order(alpacaKeys, "sell", "market", position);
    // close position
    else if (
      position.unrealized_plpc > 0.03 &&
      (bars[0].close < bars[0].open || bars[1].close < bars[1].open)
    )
      await Alpaca.order(alpacaKeys, "sell", "market", position);
  }

  return true;
}

module.exports = Run;

function formatPl(pl) {
  return parseInt(pl * 1000) / 10 + "%";
}
