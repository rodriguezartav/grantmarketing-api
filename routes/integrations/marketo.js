var express = require("express");
var router = express.Router();
const JWT = require("../../helpers/jwt");
const Knex = require("../../helpers/knex");
const moment = require("moment");
const superagent = require("superagent");
const jwt_decode = require("jwt-decode");

router.get("/:customer_id", async function (req, res, next) {
  try {
    const integration = await Knex()
      .table("integrations")
      .select("integrations.*", "providers.name as provider")
      .join("providers", "providers.id", "integrations.provider_id")
      .where("providers.name", "marketo")
      .where("customer_id", parseInt(req.query.state))
      .first();

    if (!integration) return res.send(404);

    const oauthRes = await superagent.get(
      `${integration.application_id}/oauth/token?grant_type=client_credentials&client_id=${integration.client_id}&client_secret=${integration.client_secret}`
    );

    await Knex()
      .table("integrations")
      .update({
        auth_token: oauthRes.body.access_token,
        refresh_token: oauthRes.body.access_token,
        external_user_id: response.body.scope,
        expiry_date: moment().add(oauthRes.body.expires_in, "seconds"),
      })
      .where("id", integration.id);

    res.redirect(`${process.env.WEB_URL}/connected`);
  } catch (e) {
    return next(e);
  }
});

function base64encode(str) {
  let buff = new Buffer(str);
  return buff.toString("base64");
}
module.exports = router;
