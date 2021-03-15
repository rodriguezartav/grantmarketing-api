if (!process.env.NODE_ENV) require("dotenv").config();

const Knex = require("../../helpers/knex_pg");
const Alpaca = require("../../helpers/alpaca");
const moment = require("moment");

const knex = async function Run(integrationMap, users, scriptOptions) {
  const pgString = integrationMap["postgres"];
  const alpacaKeys = integrationMap["alpaca"];
  const knex = Knex(pgString);

  const symbols = await knex.table("symbols").select();
  Alpaca.getBars(
    alpacaKeys,
    symbols.map((item) => item.symbol)
  );

  return true;
};

module.exports = Run;
