var getKnex = require("../helpers/knex");
const { filterQuery: defaultFilterQuery } = require("./getList");

module.exports = async (table, body, trx) => {
  const knex = trx || getKnex();

  var query = knex.table(table).sum(body.field).groupBy(body.groupBy);

  var result = await defaultFilterQuery(table, query, body.filter);

  return result;
};
