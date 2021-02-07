var getKnex = require("../helpers/knex");
const { filterQuery: defaultFilterQuery } = require("./getList");

module.exports = async (resource, filter, trx) => {
  const knex = trx || getKnex();

  var results = await defaultFilterQuery(
    resource,
    knex.table(resource).select(),
    filter
  );

  results.forEach((result) => {
    if (result.items_json) result.items_json = result.items_json.items;
  });
  return results;
};
