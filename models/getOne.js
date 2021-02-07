var getKnex = require("../helpers/knex");
const { filterQuery: defaultFilterQuery } = require("./getList");

module.exports = async (table, filter, trx, forUpdate) => {
  const knex = trx || getKnex();

  var query = knex.table(table).select();

  const result = await defaultFilterQuery(table, query, filter).first();
  if (result && result.items_json) result.items_json = result.items_json.items;

  return result;
};
