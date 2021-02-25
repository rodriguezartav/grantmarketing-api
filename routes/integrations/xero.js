var express = require("express");
var router = express.Router();
const JWT = require("../../helpers/jwt");
const Knex = require("../../helpers/knex");
const moment = require("moment");
const superagent = require("superagent");
const jwt_decode = require("jwt-decode");

router.get("/callback", async function (req, res, next) {
  try {
    const integration = await Knex()
      .table("integrations")
      .select("integrations.*", "providers.name as provider")
      .join("providers", "providers.id", "integrations.provider_id")
      .where("providers.name", "xero")
      .where("customer_id", parseInt(req.query.state))
      .first();

    const oauthRes = await superagent
      .post("https://identity.xero.com/connect/token")
      .type("form")
      .set(
        "authorization",
        "Basic " +
          base64encode(integration.client_id + ":" + integration.client_secret)
      )
      .send({
        grant_type: "authorization_code",
        code: req.query.code,
        redirect_uri: `${process.env.API_URL}/integrations/xero/callback`,
      });

    var token = oauthRes.body.access_token;
    var decoded = jwt_decode(token);
    console.log(decoded);

    const identityRes = await superagent
      .get("https://api.xero.com/connections")

      .set("Authorization", "Bearer " + token);

    await Knex()
      .table("integrations")
      .update({
        external_user_id: token.xero_userid,
        auth_token: oauthRes.body.access_token,
        refresh_token: oauthRes.body.refresh_token,
        expiry_date: moment().add(oauthRes.body.expires_in, "seconds"),
        application_id: identityRes.body[0].tenantId,
      })
      .where("id", integration.id);

    res.redirect(`${process.env.WEB_URL}/connected`);
  } catch (e) {
    return next(e);
  }
});

router.get("/:customer_id", async function (req, res, next) {
  const integration = await Knex()
    .table("integrations")
    .select("integrations.*", "providers.name as provider")
    .join("providers", "providers.id", "integrations.provider_id")
    .where("providers.name", "xero")
    .where("customer_id", req.params.customer_id)
    .first();

  const scopes =
    "offline_access openid profile email accounting.transactions accounting.journals.read accounting.settings accounting.contacts accounting.attachments accounting.reports.read";

  res.redirect(
    `https://login.xero.com/identity/connect/authorize?response_type=code&client_id=${integration.client_id}&redirect_uri=${process.env.API_URL}/integrations/xero/callback&scope=${scopes}&state=${req.params.customer_id}`
  );
});

function base64encode(str) {
  let buff = new Buffer(str);
  return buff.toString("base64");
}
module.exports = router;
