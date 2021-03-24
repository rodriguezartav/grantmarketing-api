const moment = require("moment");
const request = require("superagent");
const Marketo = require("../../helpers/marketo");
const Knex = require("../../helpers/knex_pg");

let knex;
module.exports = async function Run(integrationMap) {
  try {
    const knex = Knex(integrationMap["postgres"]);

    const startDate = "2020-08-23T:00:00:00";
    const endDate = "2020-09-01T:00:00:00";

    const { rows: deliveredByLead } = await knex.raw(
      `select count(inact.id), inact.lead_id from activities inact where  activity_date >= '${startDate}' and activity_date < '${endDate}' and activity_type_id=7  group by inact.lead_id;`
    );

    const { rows: openedByLead } = await knex.raw(
      `select count(inact.id), inact.lead_id from activities inact where  activity_date >= '${startDate}' and activity_date < '${endDate}' and activity_type_id=10 and (select count("id") from activities oact where activity_type_id=7 and oact.lead_id = inact.lead_id and oact."campaignRunId" = inact."campaignRunId" ) > 0 group by inact.lead_id;`
    );

    const { rows: clickedbyLead } = await knex.raw(
      `select count(inact.id), inact.lead_id from activities inact where  activity_date >= '${startDate}' and activity_date < '${endDate}' and activity_type_id=11 and (select count("id") from activities oact where activity_type_id=7 and oact.lead_id = inact.lead_id and oact."campaignRunId" = inact."campaignRunId" ) > 0 group by inact.lead_id;`
    );

    const openMap = {};
    openedByLead.forEach((element) => {
      openMap[element.lead_id] = element.count;
    });

    const linkMap = {};
    clickedbyLead.forEach((element) => {
      linkMap[element.lead_id] = element.count;
    });

    const leadsData = deliveredByLead.map((item) => {
      return {
        unique_id: `${item.lead_id}-${startDate}-${endDate}`,
        lead_id: item.lead_id,
        delivered: item.count || 0,
        opened: openMap[item.lead_id] || 0,
        clicked: linkMap[item.lead_id] || 0,
        start_date: startDate,
        end_date: endDate,
      };
    });

    await knex
      .table("lead_engagements")
      .insert(leadsData)
      .onConflict("unique_id")
      .merge();

    await knex.destroy();
    return true;
  } catch (e) {
    console.log(e);

    throw e;
  }
};
