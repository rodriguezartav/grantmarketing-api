var express = require("express");
var router = express.Router();
const JWT = require("../../helpers/jwt");
const Knex = require("../../helpers/knex");
const moment = require("moment");
const superagent = require("superagent");
const jwt_decode = require("jwt-decode");

router.get("/:customer_id", async function (req, res, next) {
  const integration = await Knex()
    .table("integrations")
    .select("integrations.*", "providers.name as provider")
    .join("providers", "providers.id", "integrations.provider_id")
    .where("providers.name", "salesforce_password")
    .where("customer_id", req.params.customer_id)
    .first();

  if (!integration) return res.sendStatus("404");

  res.redirect(
    `https://login.salesforce.com/services/oauth2/authorize?response_type=code&client_id=${integration.client_id}&redirect_uri=${process.env.API_URL}/integrations/salesforce/callback&state=${req.params.customer_id}`
  );
});

function base64encode(str) {
  let buff = new Buffer(str);
  return buff.toString("base64");
}
module.exports = router;
