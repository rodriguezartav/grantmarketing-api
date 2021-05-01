const Victron = require("../../helpers/victron");

const moment = require("moment");
const request = require("superagent");

const S3 = require("../../helpers/s3");
const SMS = require("../../helpers/sms");

const AWS = require("aws-sdk");
var firehose = new AWS.Firehose({ region: "us-east-1" });

module.exports = async function Run(integrationMap) {
  try {
    const victron = new Victron(integrationMap["victron"]);
    const stats = await victron.stats();
    console.log(stats.records.today);
    //  if (parseFloat(dataMap["bv"].rawValue) < 51)
    //   await SMS("Tamales Battery Voltage is below 51", "+50684191862");
  } catch (e) {
    console.log(e);

    throw e;
  }
};

function arrayToObject(array) {
  let obj = {};
  array.forEach((item) => (obj[item.name] = item.value));
  return obj;
}
