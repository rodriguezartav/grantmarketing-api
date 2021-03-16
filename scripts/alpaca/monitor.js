if (!process.env.NODE_ENV) require("dotenv").config();

const Knex = require("../../helpers/knex_pg");
const Alpaca = require("../../helpers/alpaca");
const finnhub = require("../../helpers/finnhub");
const moment = require("moment");
const position = require("@alpacahq/alpaca-trade-api/lib/resources/position");

async function Run(integrationMap, users, scriptOptions) {
  const pgString = integrationMap["postgres"];
  const alpacaKeys = integrationMap["alpaca"];
  const knex = Knex(pgString);
  const alpaca = Alpaca(alpacaKeys, true); //PAPER!

  const stocks = await knex.table("stocks").select();

  const indicators = await finnhub.indicators(
    integrationMap["finnhub"],
    stocks.map((item) => item.symbol)
  );

  const rsi = await finnhub.rsi(
    integrationMap["finnhub"],
    stocks.map((item) => item.symbol)
  );

  const positions = await alpaca.getPositions();

  let positionsMap = {};
  positions.forEach((item) => {
    item.current_price = parseFloat(item.current_price);
    item.avg_entry_price = parseFloat(item.avg_entry_price);
    item.unrealized_plpc = parseFloat(item.unrealized_plpc);
    positionsMap[item.symbol] = item;
  });

  for (let index = 0; index < stocks.length; index++) {
    const stock = stocks[index];
    const position = positionsMap[stock.symbol];

    const maxs = await knex
      .table("bars")
      .max("high as max")
      .where("symbol", stock.symbol)
      .where("time", ">", moment().startOf("day").unix());

    const current = await knex
      .table("bars")
      .select()
      .where("symbol", stock.symbol)
      .orderBy("time", "DESC")
      .limit(10);

    console.log(
      position,
      maxs[0].max,
      current,
      moment(current.time).toISOString()
    );
  }

  return true;
}

module.exports = Run;
