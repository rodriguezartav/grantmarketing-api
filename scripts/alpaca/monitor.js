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
  return true;
}

module.exports = Run;
