const moment = require("moment");
const request = require("superagent");
const Marketo = require("../../helpers/marketo");
const Knex = require("../../helpers/knex_pg");
const S3 = require("../../helpers/s3");

const { Parser } = require("json2csv");

let knex;
module.exports = async function Run(integrationMap) {
  try {
    const knex = Knex(integrationMap["postgres"]);

    const s3 = new S3();

    let manifest = await s3.get(
      "customers.jungledynamics.com",
      `heap/activities/manifest.json`
    );

    if (manifest) manifest = JSON.parse(manifest);
    else manifest = [];

    const startFilter = manifest[manifest.length - 1]
      ? moment(manifest[manifest.length - 1].end)
      : moment().add(-7, "months");

    await Marketo.getBulkActivities(
      integrationMap["marketo"],
      startFilter.format("YYYY-MM-DDTHH:MM:SS"),
      [1, 2],
      saveActivities,
      onEnd
    );

    async function saveActivities(activities) {
      let start = moment(activities[0].activityDate).toISOString();
      let end = moment(
        activities[activities.length - 1].activityDate
      ).toISOString();
      manifest.push({ start, end });
      const keys = [];
      activities = activities.filter((item) => {
        const attributes = arrayToObject(item.attributes);
        item.attributes = attributes;
        const marketoGUID = `${item.activityTypeId}-${item.leadId}-${attributes["Campaign Run ID"]}`;
        item.marketoGUID = marketoGUID;
        if (keys.indexOf(item.marketoGUID) == -1) {
          keys.push(item.marketoGUID);
          return true;
        }
        return false;
      });

      const fields = Object.keys(activities[0]);
      const opts = { fields };

      const parser = new Parser(opts);
      const csv = parser.parse(activities);

      await s3.put(
        "customers.jungledynamics.com",
        `heap/activities/${start}-${end}.csv`,
        csv
      );

      await s3.put(
        "customers.jungledynamics.com",
        `heap/activities/manifest.json`,
        JSON.stringify(manifest)
      );

      return true;
      var i,
        j,
        temparray,
        chunk = 500;
      for (i = 0, j = activities.length; i < j; i += chunk) {
        temparray = activities.slice(i, i + chunk).map((activity) => {
          return {
            marketoGUID: activity.marketoGUID,
            lead_id: activity.leadId,
            activity_date: activity.activityDate,
            activity_type_id: activity.activityTypeId,
            campaignRunId: activity.attributes["Campaign Run ID"],
            campaign_id:
              activity.campaignId == "null" ? null : activity.campaignId,
            primary_attribute_value_id: activity.primaryAttributeValueId,
            primary_attribute_value: activity.primaryAttributeValue,
            attributes: activity.attributes,
            program_name: activity.primaryAttributeValue.split(".")[0],
          };
        });
        await knex
          .table("activities")
          .insert(temparray)
          .onConflict("marketoGUID")
          .merge();
      }
    }

    async function onEnd() {
      await knex.destroy();
    }
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
