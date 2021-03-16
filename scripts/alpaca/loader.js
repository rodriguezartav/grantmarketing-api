if (!process.env.NODE_ENV) require("dotenv").config();

const Knex = require("../../helpers/knex_pg");
const Alpaca = require("../../helpers/alpaca");
const moment = require("moment");

async function Run(integrationMap, users, scriptOptions) {
  const pgString = integrationMap["postgres"];
  const alpacaKeys = integrationMap["alpaca"];
  const knex = Knex(pgString);

  const symbols = await knex.table("stocks").select();
  const symbolsWithBars = await Alpaca.getBars(
    alpacaKeys,
    symbols.map((item) => item.symbol)
  );

  for (let index1 = 0; index1 < symbolsWithBars.length; index1++) {
    const symbolWithBars = symbolsWithBars[index1];
    for (let index = 0; index < symbolWithBars.bars.length; index++) {
      const bar = symbolWithBars.bars[index];
      await knex
        .table("bars")
        .insert({
          time_symbol: bar.t + "_" + symbolWithBars.symbol,
          symbol: symbolWithBars.symbol,
          time: bar.t,
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
