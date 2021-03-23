var express = require("express");
var router = express.Router();
const JWT = require("../../helpers/jwt");
const Knex = require("../../helpers/knex");
const moment = require("moment");
const superagent = require("superagent");
const jwt_decode = require("jwt-decode");
const { TenNinetyNineContact } = require("xero-node");

router.get("/:provider/:customer_id", async function (req, res, next) {
  const provider = req.params.provider;

  const integration = await Knex()
    .table("integrations")
    .select("integrations.*", "providers.name as provider")
    .join("providers", "providers.id", "integrations.provider_id")
    .where("providers.name", provider)
    .where("customer_id", req.params.customer_id)
    .first();

  if (!integration) return res.sendStatus("404");

  await Knex()
    .table("integrations")
    .update({
      is_connected: true,
      expiry_date: moment().add(10, "years"),
    })
    .where("id", integration.id);

  return res.redirect(`${process.env.WEB_URL}/connected`);
});

module.exports = router;
TenNinetyNineContact;
