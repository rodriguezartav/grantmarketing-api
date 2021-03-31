const moment = require("moment");
const request = require("superagent");
const Marketo = require("../../helpers/marketo");

const S3 = require("../../helpers/s3");

const AWS = require("aws-sdk");
var firehose = new AWS.Firehose({ region: "us-east-1" });

const { Readable } = require("stream");
const { AsyncParser } = require("json2csv");

const { Parser } = require("json2csv");
let allActivities = [];

module.exports = async function Run(integrationMap) {
  try {
    const s3 = new S3();

    let leadsCSV = await s3.get(
      "customers.jungledynamics.com",
      `heap/leads.csv`
    );

    const csv = require("csvtojson");
    leads = await csv().fromString(leadsCSV);

    let leadMap = {};
    leads.forEach((lead) => (leadMap[lead.Id] = lead));

    let manifest = await s3.get(
      "customers.jungledynamics.com",
      `heap/activities/manifest.json`
    );

    if (manifest) manifest = JSON.parse(manifest);
    else manifest = [];

    const startFilter =
      manifest.length > 0
        ? moment(manifest[manifest.length - 1])
        : moment().add(-1, "years").startOf("year");

    await Marketo.getBulkActivities(
      integrationMap["marketo"],
      startFilter.format("YYYY-MM-DDTHH:MM:SS"),
      [1, 2],
      async (activities) => {
        if (!activities) return;

        let lastDate = activities[activities.length - 1].activityDate;

        activities = activities.filter((item) => {
          if (!leadMap[item.leadId]) return false;
          if (moment(item.activityDate).isSameOrBefore(startFilter))
            return false;
          const attributes = arrayToObject(item.attributes);
          item.attributes = attributes;
          return true;
        });

        if (activities.length > 0) {
          var params = {
            Records: activities.map((item) => {
              return {
                Data: `${item.id},${item.leadId},${item.activityDate},${item.activityTypeId},"${item.primaryAttributeValue}"\n`,
              };
            }),

            DeliveryStreamName: "marketoStream" /* required */,
          };
          await firehose.putRecordBatch(params).promise();

          manifest.push(lastDate);
          await s3.put(
            "customers.jungledynamics.com",
            `heap/activities/manifest.json`,
            JSON.stringify(manifest)
          );
        }
      },
      async () => {}
    );
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
