if (!process.env.NODE_ENV) require("dotenv").config();
const Knex = require("../../helpers/knex");
const { Parser } = require("json2csv");
const { google } = require("googleapis");
const { enums } = require("googleapis");
const SendGrid = require("../../helpers/sendgrid");
const sms = require("../../helpers/sms");
const { GoogleAdsApi } = require("google-ads-api");
const moment = require("moment");
const AWS = require("aws-sdk");
var s3 = new AWS.S3();

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

    let csv = "campaing,cost";
    if (campaigns.length > 0) {
      const json2csvParser = new Parser();
      csv = json2csvParser.parse(campaigns);
    }

    const random = parseInt(Math.random() * 10000000);
    var params = {
      Body: csv,
      Bucket: "reports.jungledynamics.com",
      Key: "csv/" + random + ".csv",
    };
    await s3.putObject(params);

    sms(
      `Your report  http://reports.jungledynamics.com/csv/${random}.csv`,
      users[0].country_code + users[0].phone
    );

    process.exit(0);
  } catch (e) {
    //  if (trx) await trx.rollback();
    console.log(e);
    throw e;
  }
};
