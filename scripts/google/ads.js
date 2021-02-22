if (!process.env.NODE_ENV) require("dotenv").config();
const Knex = require("../../helpers/knex");

const { google } = require("googleapis");
const { enums } = require("googleapis");
const { GoogleAdsApi } = require("google-ads-api");
const moment = require("moment");

async function Run(integrationMap) {
  try {
    const google = await Knex()
      .table("integrations")
      .select()
      .where("customer_id", 1)
      .where("provider_name", "google")
      .first();

    const client = new GoogleAdsApi({
      client_id: google.client_id,
      client_secret: google.client_secret,
      developer_token: google.api_key,
    });

    const customer = client.Customer({
      customer_id: "7333589176",
      refresh_token: google.auth_token,
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
    await knex.destroy();
    process.exit(0);
  } catch (e) {
    //  if (trx) await trx.rollback();
    console.log(e);
    await knex.destroy();
    throw e;
  }
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

if (process.argv[1].indexOf("scripts") != -1) {
  (async function () {
    try {
      await Run();
      process.exit(0);
    } catch (e) {
      console.error(e);
      await Knex().destroy();
      process.exit(1);
    }
  })();
}
