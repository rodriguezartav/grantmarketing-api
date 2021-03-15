if (!process.env.NODE_ENV) require("dotenv").config();

const Knex = require("../../helpers/knex_pg");
const Alpaca = require("../../helpers/alpaca");
const moment = require("moment");

async function Run(integrationMap, users, scriptOptions) {
  const pgString = integrationMap["postgres"];
  const alpacaKeys = integrationMap["alpaca"];
  const knex = Knex(pgString);

  const symbols = await knex.table("stocks").select();
  await Alpaca.getBars(
    alpacaKeys,
    symbols.map((item) => item.symbol)
  );

  return true;
}

module.exports = Run;
