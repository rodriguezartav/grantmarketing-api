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
        startAt: "2020-03-01T00:00:00Z",
        endAt: "2020-03-11T00:00:00Z",
      },
    };

    const activities = await Marketo.batch(
      "activities",
      fields,
      filter,
      integrationMap["marketo"]
    );

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
