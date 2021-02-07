var getKnex = require("../helpers/knex");

const getList = async (table, body, trx) => {
  const knex = trx || getKnex();
  if (!body.pagination) {
    body.pagination = { perPage: 50, page: 1 };
  }

  var query = filterQuery(
    table,
    body.noSelect ? knex.table(table) : knex.table(table).select(body.select),
    body.filter,
    body.sort,
    body.forUpdate
  );

  if (body.distinct) query = query.distinct(body.distinct);

  var results = await query
    .limit(body.pagination.perPage)
    .offset((body.pagination.page - 1) * body.pagination.perPage);

  results.forEach((result) => {
    if (result.items_json) result.items_json = result.items_json.items;
  });

  var count = await filterQuery(
    table,
    knex.table(table).count("id as id"),
    body.filter
  ).first();

  return { results, count: parseInt(count.id) };
};

const filterQuery = (
  table,
  query,
  filter = {},
  sort = [],
  forUpdate = false
) => {
  const keys = Object.keys(filter).filter((key) => key !== "q");
  keys.forEach((key) => {
    const [keyName, keyOperation = "="] = key.split(",");
    const fullKeyName = `${table}.${keyName}`;
    const value = filter[key];

    if (keyName.indexOf("to_") === 0 && value instanceof Date) {
      const dateKeyName = `${table}.${keyName.substring(3)}`;
      query = query.where(dateKeyName, "<=", value);
    } else if (keyName.indexOf("from_") === 0 && value instanceof Date) {
      const dateKeyName = `${table}.${keyName.substring(5)}`;
      query = query.where(dateKeyName, ">=", value);
    } else if (keyOperation == "=" && Array.isArray(value)) {
      query = query.where(fullKeyName, "IN", value);
    } else if (value.indexOf && value.indexOf("%") > -1) {
      query = query.where(fullKeyName, "ilike", value);
    } else if (keyOperation == "like" || keyOperation == "ilike") {
      query = query.where(fullKeyName, keyOperation, `%${value}%`);
    } else {
      query = query.where(fullKeyName, keyOperation, value);
    }
  });
  query = query.orderBy(sort);
  if (forUpdate) return query.forUpdate();

  return query;
};

module.exports = { default: getList, filterQuery };
