var express = require("express");
var router = express.Router();
const JWT = require("../../helpers/jwt");
const Knex = require("../../helpers/knex");
const moment = require("moment");
const superagent = require("superagent");
const jwt_decode = require("jwt-decode");

router.get("/callback", async function (req, res, next) {
  console.log(req.query);
  try {
    const integration = await Knex()
      .table("integrations")
      .select()
      .where("provider_name", "google")
      .where("customer_id", parseInt(req.query.state))
      .first();

    if (!integration) return res.send(404);

    const oauthRes = await superagent
      .post("https://oauth2.googleapis.com/token")

      .send({
        grant_type: "authorization_code",
        code: req.query.code,
        response_type: "code",
        client_id: integration.client_id,
        client_secret: integration.client_secret,
        redirect_uri: `${process.env.API_URL}/integrations/google/callback`,
      });

    await Knex()
      .table("integrations")
      .update({
        external_user_id: oauthRes.body.id,
        auth_token: oauthRes.body.access_token,
        refresh_token: oauthRes.body.refresh_token,
        expiry_date: moment().add(oauthRes.body.expires_in, "seconds"),
        application_id: oauthRes.body.instance_url,
      })
      .where("id", integration.id);

    res.render("connected");
  } catch (e) {
    return next(e);
  }
});

router.get("/:customer_id", async function (req, res, next) {
  const integration = await Knex()
    .table("integrations")
    .select()
    .where("provider_name", "google")
    .where("customer_id", req.params.customer_id)
    .first();

  if (!integration) return res.render("404");

  res.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?access_type=offline&scope=https://www.googleapis.com/auth/analytics.readonly https://www.googleapis.com/auth/analytics.readonly https://www.googleapis.com/auth/adwords &response_type=code&client_id=${integration.client_id}&redirect_uri=${process.env.API_URL}/integrations/google/callback&state=${req.params.customer_id}`
  );
});

function base64encode(str) {
  let buff = new Buffer(str);
  return buff.toString("base64");
}
module.exports = router;