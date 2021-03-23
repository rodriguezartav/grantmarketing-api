var express = require("express");
var router = express.Router();
const JWT = require("../../helpers/jwt");
const Knex = require("../../helpers/knex");
const moment = require("moment");
const superagent = require("superagent");
const jwt_decode = require("jwt-decode");
const { TenNinetyNineContact } = require("xero-node");

router.get("/callback", async function (req, res, next) {
  try {
    const integration = await Knex()
      .table("integrations")
      .select("integrations.*", "providers.type as provider_type")
      .join("providers", "providers.id", "integrations.provider_id")
      .where("providers.name", "google")
      .where("customer_id", parseInt(req.query.state))
      .first();

    if (!integration) return res.send(404);

    if (integration.provider_type == "oauth") {
      const integration_tokens = await Knex()
        .table("integration_tokens")
        .select()
        .join("providers", "providers.id", "integration_tokens.provider_id")
        .where("providers.name", "google")
        .first();

      integration.client_id = integration_tokens.client_id;
      integration.client_secret = integration_tokens.client_secret;
      if (!integration.application_id)
        integration.application_id = integration_tokens.application_id;
    }

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
        is_connected: true,
        external_user_id: oauthRes.body.id,
        auth_token: oauthRes.body.access_token,
        refresh_token: oauthRes.body.refresh_token,
        expiry_date: moment().add(oauthRes.body.expires_in, "seconds"),
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
    .where("providers.name", "google")
    .where("customer_id", req.params.customer_id)
    .first();

  if (!integration) return res.sendStatus("404");

  const integrationToken = await Knex()
    .table("integration_tokens")
    .select("integration_tokens.*", "providers.name as provider")
    .join("providers", "providers.id", "integration_tokens.provider_id")
    .where("providers.name", "google")
    .first();

  const url = `https://accounts.google.com/o/oauth2/v2/auth?access_type=offline&scope=https://www.googleapis.com/auth/analytics.readonly https://www.googleapis.com/auth/adwords&response_type=code&client_id=${integrationToken.client_id}&redirect_uri=${process.env.API_URL}/integrations/google/callback&state=${req.params.customer_id}&prompt=consent`;

  res.redirect(url);
});

module.exports = router;
TenNinetyNineContact;
