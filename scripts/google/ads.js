if (!process.env.NODE_ENV) require("dotenv").config();
const Knex = require("../../helpers/knex");
const { Parser } = require("json2csv");
const { google } = require("googleapis");
const { enums } = require("googleapis");
const Mailgun = require("../../helpers/mailgun");
const { GoogleAdsApi } = require("google-ads-api");
const moment = require("moment");
const AWS = require("aws-sdk");
var s3 = new AWS.S3();

async function Run(integrationMap, users, scriptOptions) {
  const googleIntegration = integrationMap["google"];
  const mailgun = Mailgun();

  const client = new GoogleAdsApi({
    client_id: googleIntegration.client_id,
    client_secret: googleIntegration.client_secret,
    developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
  });

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
  await s3.putObject(params).promise();

  //ES6
  const data = {
    from: "reports+no-reply@jungledynamics.com",
    to: scriptOptions.email,
    subject: "Your Google Ads Report",
    text: `http://reports.jungledynamics.com/csv/${random}.csv`,
  };

  const res = await mailgun.messages().send(data);
  console.log(res);
  return true;
}

Run.options = {
  properties: {
    email: {
      type: "string",
      label: "Email",
      description: "Email used to send report",
    },
  },
  required: ["email"],
};

module.exports = Run;
