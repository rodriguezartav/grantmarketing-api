const moment = require("moment");
const request = require("superagent");
const Marketo = require("../../helpers/marketo");
const Knex = require("../../helpers/knex_pg");
const S3 = require("../../helpers/s3");

const { Parser } = require("json2csv");
let allActivities = [];

let knex;
module.exports = async function Run(integrationMap) {
  try {
    const knex = Knex(integrationMap["postgres"]);

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

    async function onSaveActivities(activities, last = false) {
      console.log("saving", allActivities.length, last);

      if (activities) allActivities = allActivities.concat(activities);
      if (allActivities.length > 50000 || last) {
        let start = moment(allActivities[0].activityDate).toISOString();
        let end = moment(
          allActivities[allActivities.length - 1].activityDate
        ).toISOString();
        manifest.push({ start, end });

        const fields = Object.keys(allActivities[0]);
        const opts = { fields };

        const parser = new Parser(opts);
        const csv = parser.parse(allActivities);

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
        allActivities = [];
      }
    }

    async function saveActivities(activities) {
      const keys = [];
      activities = activities.filter((item) => {
        if (!leadMap[item.leadId]) return false;
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

      await onSaveActivities(activities);

      return true;
    }

    async function onEnd() {
      await onSaveActivities(null, true);
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
