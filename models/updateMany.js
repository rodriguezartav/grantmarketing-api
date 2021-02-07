var getKnex = require("../helpers/knex");

module.exports = async (resource, body, ids, trx) => {
  const knex = trx || getKnex();

  let updateBody = { ...body };

  if (updateBody.items_json) updateBody.items_json = { items: body.items_json };

  await knex.table(resource).update(updateBody).whereIn("id", ids);

  return knex.table(resource).select().whereIn("id", ids);
};
