if (!process.env.NODE_ENV) require("dotenv").config();

const Knex = require("../../helpers/knex_pg");
const Alpaca = require("../../helpers/alpaca");
const moment = require("moment-timezone");
moment.tz.setDefault("America/New_York");

async function Run(integrationMap, users, scriptOptions) {
  const pgString = integrationMap["postgres"];
  const alpacaKeys = integrationMap["alpaca"];
  const knex = Knex(pgString);
  const alpaca = Alpaca(alpacaKeys, true); //PAPER!

  const marketStatus = await Alpaca.marketStatus(alpacaKeys);
  if (!marketStatus.isOpen && !marketStatus.afterHours) return true;

  const symbols = await knex.table("stocks").select();
  const symbolsWithBars = await Alpaca.getBars(
    alpacaKeys,
    symbols.map((item) => item.symbol)
  );

  const positions = await alpaca.getPositions();

  for (let index = 0; index < positions.length; index++) {
    const position = positions[index];
    await knex.table("unrealized_profits").insert({
      symbol: position.symbol,
      time: moment().unix(),
      plpc: position.unrealized_plpc,
    });
  }

  for (let index1 = 0; index1 < symbolsWithBars.length; index1++) {
    const symbolWithBars = symbolsWithBars[index1];
    for (let index = 0; index < symbolWithBars.bars.length; index++) {
      const bar = symbolWithBars.bars[index];
      await knex
        .table("bars")
        .insert({
          time_symbol: bar.t * 1000 + "_" + symbolWithBars.symbol,
          symbol: symbolWithBars.symbol,
          time: bar.t * 1000,
          open: bar.o,
          close: bar.c,
          high: bar.h,
          low: bar.l,
          volume: bar.v,
        })
        .onConflict("time_symbol")
        .merge();
    }
  }

  const symbolsWithDays = await Alpaca.getBars(
    alpacaKeys,
    symbols.map((item) => item.symbol),
    "day",
    -45
  );

  for (let index1 = 0; index1 < symbolsWithDays.length; index1++) {
    const symbolWithBars = symbolsWithDays[index1];
    for (let index = 0; index < symbolWithBars.bars.length; index++) {
      const bar = symbolWithBars.bars[index];
      await knex
        .table("days")
        .insert({
          time_symbol: bar.t * 1000 + "_" + symbolWithBars.symbol,
          symbol: symbolWithBars.symbol,
          date: moment(bar.t * 1000)
            .tz("America/New_York")
            .format("YYYY-MM-DD"),
          open: bar.o,
          close: bar.c,
          high: bar.h,
          low: bar.l,
          volume: bar.v,
        })
        .onConflict("time_symbol")
        .merge();
    }
  }

  return true;
}

module.exports = Run;
