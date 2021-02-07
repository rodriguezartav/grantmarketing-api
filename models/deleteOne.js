var getKnex = require("../helpers/knex");

module.exports = async (table, body, trx) => {
  const knex = trx || getKnex();

  if (body.id) return knex.table(table).delete().where("id", id);
  if (body.ids) return knex.table(table).delete().whereIn("id", ids);
};
