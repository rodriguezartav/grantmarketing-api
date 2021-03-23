const moment = require("moment");
const request = require("superagent");
const Marketo = require("../../helpers/marketo");
const Knex = require("../../helpers/knex_pg");

let knex;
module.exports = async function Run(integrationMap) {
  try {
    const knex = Knex(integrationMap["postgres"]);

    const firstActivity = await knex
      .table("activities")
      .select("activity_date")
      .orderBy("activity_date", "DESC")
      .first();

    const startFilter =
      firstActivity && firstActivity.activity_date
        ? moment(firstActivity.activity_date)
        : moment().add(-7, "months");

    let activities = await Marketo.getBulkActivities(
      integrationMap["marketo"],
      startFilter.format("YYYY-MM-DDTHH:MM:SS"),
      [6, 7, 8, 9, 10, 11, 27]
    );

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

    await knex.destroy();
    return true;
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
