if (!process.env.NODE_ENV) require("dotenv").config();

const Knex = require("../../helpers/knex_pg");
const Alpaca = require("../../helpers/alpaca");
const finnhub = require("../../helpers/finnhub");
const moment = require("moment");
const position = require("@alpacahq/alpaca-trade-api/lib/resources/position");
const sms = require("../../helpers/sms");

async function Run(integrationMap, users, scriptOptions) {
  const pgString = integrationMap["postgres"];
  const alpacaKeys = integrationMap["alpaca"];
  const knex = Knex(pgString);
  const alpaca = Alpaca(alpacaKeys, true); //PAPER!

  const stocks = await knex.table("stocks").select();

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

    const pclps = await knex
      .table("unrealized_profits")
      .where("symbol", stock.symbol)
      .where("time", ">", moment().add(-1, "days").startOf("day").unix())
      .orderBy("time", "DESC");

    const plMax = await knex
      .table("unrealized_profits")
      .max("plpc")
      .where("symbol", stock.symbol)
      .where("time", ">", moment().add(-1, "days").startOf("day").unix());

    if (position.unrealized_plpc < -0.01)
      await sms(`${stock.symbol} is dropping to -1%`, "+50684191862");
    else if (position.unrealized_plpc < -0.015)
      await sms(`${stock.symbol} dropped to -1.5%`, "+50684191862");
    else if (position.unrealized_plpc > 0.05)
      await sms(
        `${stock.symbol} is reaching to ${formatPl(position.unrealized_plpc)}`,
        "+50684191862"
      );
    else if (position.unrealized_plpc < plMax[0].max)
      await sms(
        `${stock.symbol} is dropping from Max of ${formatPl(plMax[0].max)}`,
        "+50684191862"
      );
    else if (position.unrealized_plpc > plMax[0].max)
      await sms(
        `${stock.symbol} is climbing from Max of ${formatPl(plMax[0].max)}`,
        "+50684191862"
      );
  }

  return true;
}

module.exports = Run;

function formatPl(pl) {
  return parseInt(pl * 1000) / 10 + "%";
}
