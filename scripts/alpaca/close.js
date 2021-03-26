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

  const marketStatus = await Alpaca.marketStatus(alpacaKeys);
  //if (!marketStatus.isOpen && !marketStatus.afterHours) return true;

  await alpaca.cancelAllOrders();

  const positions = await alpaca.getPositions();

  let positionsMap = {};
  positions.forEach((item) => {
    item.current_price = parseFloat(item.current_price);
    item.avg_entry_price = parseFloat(item.avg_entry_price);
    item.unrealized_plpc = parseFloat(item.unrealized_plpc);
    positionsMap[item.symbol] = item;
  });

  for (let index = 0; index < positions.length; index++) {
    const position = positions[index];
    await Alpaca.sellOrDie(alpacaKeys, position);
  }

  return true;
}

module.exports = Run;
