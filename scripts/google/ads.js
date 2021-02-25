if (!process.env.NODE_ENV) require("dotenv").config();
const Knex = require("../../helpers/knex");
const { Parser } = require("json2csv");
const { google } = require("googleapis");
const { enums } = require("googleapis");
const SendGrid = require("../../helpers/sendgrid");

const { GoogleAdsApi } = require("google-ads-api");
const moment = require("moment");

module.exports = async function Run(integrationMap, users) {
  try {
    const googleIntegration = integrationMap["google"];
    const sendGrid = SendGrid(integrationMap["sendgrid"]);

    const client = new GoogleAdsApi({
      client_id: googleIntegration.client_id,
      client_secret: googleIntegration.client_secret,
      developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
    });

    console.log(googleIntegration);
    const customer = client.Customer({
      customer_id: googleIntegration.application_id
        .replace("-", "")
        .replace("-", ""),
      refresh_token: googleIntegration.auth_token,
    });

    const campaigns = await customer.report({
      entity: "campaign",
      attributes: [
        "campaign.id",
        "campaign.name",
        "campaign.bidding_strategy_type",
        "campaign_budget.amount_micros",
      ],
      metrics: [
        "metrics.cost_micros",
        "metrics.clicks",
        "metrics.all_conversions",
      ],

      limit: 20,
    });

    const json2csvParser = new Parser();
    const csv = json2csvParser.parse(campaigns);

    const msg = {
      to: "roberto@rodcocr.com",
      from: "roberto@coalicionsur.org", // Use the email address or domain you verified above
      subject: "Google Ads CSV",
      text: "Here's you google ads CSV \n" + csv,
      html: "<strong>Here's you google ads CSV</strong> <br/> " + csv,
    };
    //ES6
    await sendGrid.send(msg);

    process.exit(0);
  } catch (e) {
    //  if (trx) await trx.rollback();
    console.log(e);
    throw e;
  }
};
