const Jwt = require("../helpers/jwt");
const moment = require("moment");
const IntegrationMap = require("../helpers/integrationMap");

const KnexPg = require("../helpers/knex_pg");
const Knex = require("../helpers/knex");

var VPIMiddleware = async function (req, res, next) {
  const knex = Knex();
  const integrationMap = await IntegrationMap(knex, req.user.customer_id);
  if (integrationMap["postgres"] && integrationMap["postgres"].client_secret) {
    req.knexPg = KnexPg(integrationMap["postgres"]);
  }
  next();
};

module.exports = VPIMiddleware;
