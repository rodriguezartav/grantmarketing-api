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
  //  if (!marketStatus.isOpen) return true;

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

    const indicators = await finnhub.indicators(integrationMap["finnhub"], [
      stock.symbol,
    ]);
    const pattern = await finnhub.pattern(
      integrationMap["finnhub"],
      stock.symbol
    );

    const techIndicators = await finnhub.techIndicators(
      integrationMap["finnhub"],
      stock.symbol
    );

    const bars = await knex
      .table("bars")
      .where("symbol", stock.symbol)
      .where("time", ">", moment().tz("America/New_York").startOf("day").unix())
      .orderBy("time", "DESC");

    const days = await knex
      .table("days")
      .where("symbol", stock.symbol)
      .where("date", ">=", moment().add(-1, "days").format("YYYY-MM-DD"))
      .orderBy("date", "DESC");
  }

  return true;
}

module.exports = Run;

function formatPl(pl) {
  return parseInt(pl * 1000) / 10 + "%";
}
