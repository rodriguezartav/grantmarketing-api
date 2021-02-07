var getKnex = require("../helpers/knex");

module.exports = async (table, body, filter, trx) => {
  const knex = trx || getKnex();

  return knex
    .table(table)
    .increment(body.field, body.amount)
    .where(filter)
    .returning("id");
};
