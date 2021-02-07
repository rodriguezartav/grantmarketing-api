var getKnex = require("../helpers/knex");

module.exports = async (table, body, trx) => {
  const knex = trx || getKnex();

  return knex.table(table).delete().whereIn("id", body.ids);
};
