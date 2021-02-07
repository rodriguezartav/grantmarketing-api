var getKnex = require("../helpers/knex");
const { filterQuery: defaultFilterQuery } = require("./getList");

module.exports = async (
  resource,
  { id, sort, target, filter, pagination },
  trx
) => {
  const knex = trx || getKnex();

  var query = defaultFilterQuery(
    resource,
    knex
      .table(resource)
      .select()
      .where({ [target]: id }),
    filter,
    sort
  );

  var results = await query
    .limit(pagination.perPage)
    .offset((pagination.page - 1) * pagination.perPage);

  results.forEach((result) => {
    if (result.items_json) result.items_json = result.items_json.items;
  });

  var count = await defaultFilterQuery(
    resource,
    knex
      .table(resource)
      .count("id as id")
      .where({ [target]: id }),
    filter
  ).first();

  return { results, count: count.id };
};
