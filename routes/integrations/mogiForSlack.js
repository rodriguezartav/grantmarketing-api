var express = require("express");
var router = express.Router();
const Knex = require("../../helpers/knex");
const Slack = require("../../helpers/slack");
const moment = require("moment");
const superagent = require("superagent");

router.get("/callback", async function (req, res, next) {
  try {
    const integration = await Knex()
      .table("integrations")
      .select("integrations.*", "providers.type as provider_type")
      .join("providers", "providers.id", "integrations.provider_id")
      .where("providers.name", "mogiForSlack")
      .where("customer_id", parseInt(req.query.state))
      .first();

    if (!integration) return res.send(404);

    if (integration.provider_type == "oauth") {
      const integration_tokens = await Knex()
        .table("integration_tokens")
        .select()
        .join("providers", "providers.id", "integration_tokens.provider_id")
        .where("providers.name", "mogiForSlack")
        .first();

      integration.client_id = integration_tokens.client_id;
      integration.client_secret = integration_tokens.client_secret;
      if (!integration.application_id)
        integration.application_id = integration_tokens.application_id;
    }

    const oauthRes = await superagent
      .post("https://slack.com/api/oauth.v2.access")
      .type("form")

      .send({
        code: req.query.code,
        client_id: integration.client_id,
        client_secret: integration.client_secret,
        redirect_uri: `${process.env.API_URL}/integrations/mogiForSlack/callback`,
      });

    const updatedIntegration = {
      is_connected: true,
      external_user_id: oauthRes.body.authed_user.id,
      api_key: oauthRes.body.authed_user.access_token,
      auth_token: oauthRes.body.access_token,
      expiry_date: moment().add(1000, "months"),
    };

    await Knex()
      .table("integrations")
      .update(updatedIntegration)
      .where("id", integration.id);

    const sresCreateChannel = await superagent
      .post("https://slack.com/api/conversations.create")
      .auth(oauthRes.body.access_token, {
        type: "bearer",
      })
      .send({
        name: "mogi_insights",
      });

    const slack = await Slack(updatedIntegration);

    console.log(slack.channelsMap);

    console.log("NOTICE", sresCreateChannel.body, sresCreateChannel.text);
    try {
      try {
        const sresChannel = await superagent
          .post("https://slack.com/api/conversations.join")
          .auth(oauthRes.body.access_token, {
            type: "bearer",
          })
          .send({
            channel: slack.channelsMap["mogi_insights"].id,
          });
        console.log("NOTICE", sresChannel.body, sresChannel.text);
      } catch (e) {}

      const sres1 = await superagent
        .post("https://slack.com/api/chat.postMessage")
        .auth(oauthRes.body.access_token, {
          type: "bearer",
        })
        .send({
          channel: slack.channelsMap["general"].id,
          parse: "full",
          unfurl_links: true,
          text: "Welcome to Mogi, join #mogi_insights",
          blocks: [
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: `Hi <!everyone>, Mogi has just been installed on your Slack , join the <#${slack.channelsMap["mogi_insights"].id}|mogi_insights> channel to receive marketing analytics insights and alerts.`,
              },
            },
          ],
        });
    } catch (e) {
      console.log(e);
    }

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
    .where("providers.name", "mogiForSlack")
    .where("customer_id", req.params.customer_id)
    .first();

  if (!integration) return res.sendStatus("404");

  const integrationToken = await Knex()
    .table("integration_tokens")
    .select("integration_tokens.*", "providers.name as provider")
    .join("providers", "providers.id", "integration_tokens.provider_id")
    .where("providers.name", "mogiForSlack")
    .first();

  const url = `https://slack.com/oauth/v2/authorize?scope=chat:write,chat:write.customize,commands,im:write,im:read,groups:read,users:read,chat:write.public,users:write,users:read.email,pins:write,app_mentions:read,channels:read,channels:join,channels:manage,files:write,incoming-webhook&user_scope=chat:write&client_id=${integrationToken.client_id}&redirect_uri=${process.env.API_URL}/integrations/mogiForSlack/callback&state=${req.params.customer_id}`;

  res.redirect(url);
});

module.exports = router;
