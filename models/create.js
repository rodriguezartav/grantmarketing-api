var getKnex = require("../helpers/knex");
const Validate = require("../helpers/validate");

module.exports = async (table, body, trx) => {
  const knex = trx || getKnex();
  let insertBody = { ...body };
  if (insertBody.items_json) insertBody.items_json = { items: body.items_json };

  insertBody = await Validate(table, insertBody, true);
  var response = await knex.table(table).insert(insertBody).returning("id");

  return knex.table(table).select().where("id", response[0]).first();
};
