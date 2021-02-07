var getKnex = require("../helpers/knex");
const Validate = require("../helpers/validate");

module.exports = async (table, body, filter, trx) => {
  const knex = trx || getKnex();

  let updateBody = { ...body };

  if (updateBody.items_json) updateBody.items_json = { items: body.items_json };

  const current = await knex.table(table).select().where(filter).first();
  const mergedBody = { ...current, ...updateBody };

  await Validate(table, mergedBody);

  await knex.table(table).update(mergedBody).where(filter).returning("id");
  return knex.table(table).select().where(filter).first();
};
//
