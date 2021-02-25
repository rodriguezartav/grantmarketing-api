if (!process.env.NODE_ENV) require("dotenv").config();
const Knex = require("../../helpers/knex");

const { google } = require("googleapis");
const { enums } = require("googleapis");
const { GoogleAdsApi } = require("google-ads-api");
const moment = require("moment");

module.exports = async function Run(integrationMap) {
  try {
    const googleIntegration = integrationMap["google"];

    const client = new GoogleAdsApi({
      client_id: google.client_id,
      client_secret: google.client_secret,
      developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
    });

    console.log(googleIntegration);
    const customer = client.Customer({
      customer_id: googleIntegration.application_id,
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

    //  await trx.commit();
    process.exit(0);
  } catch (e) {
    //  if (trx) await trx.rollback();
    console.log(e);
    throw e;
  }
};
