const moment = require("moment");
const request = require("superagent");
const Marketo = require("../../helpers/marketo");
const Knex = require("../../helpers/knex_pg");

let knex;
module.exports = async function Run(integrationMap) {
  try {
    const fields = [
      "marketoGUID",
      "leadId",
      "activityDate",
      "activityTypeId",
      "campaignId",
      "primaryAttributeValueId",
      "primaryAttributeValue",
      "attributes",
    ];

    const filter = {
      createdAt: {
        startAt: "2021-03-01T00:00:00Z",
        endAt: "2021-03-13T00:00:00Z",
        activityTypeIds: [3, 6, 7, 8, 9, 10, 11, 27, 41, 40, 39, 48, 111, 112],
      },
    };

    const activities = await Marketo.batch(
      "activities",
      fields,
      filter,
      integrationMap["marketo"]
    );

    console.log(activities);

    const knex = Knex(integrationMap["postgres"]);

    for (let index = 0; index < activities.length; index++) {
      const activity = activities[index];
      await knex
        .table("activities")
        .insert({
          marketoGUID: activity.marketoGUID,
          lead_id: activity.leadId,
          activity_date: activity.activityDate,
          activity_type_id: activity.activityTypeId,
          campaign_id:
            activity.campaignId == "null" ? null : activity.campaignId,
          primary_attribute_value_id: activity.primaryAttributeValueId,
          primary_attribute_value: activity.primaryAttributeValue,
          attributes: activity.attributes,
        })
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
