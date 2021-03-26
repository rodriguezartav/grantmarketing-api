const moment = require("moment");
const request = require("superagent");
const Marketo = require("../../helpers/marketo");
const Knex = require("../../helpers/knex_pg");

let knex;
module.exports = async function Run(integrationMap) {
  try {
    const knex = Knex(integrationMap["postgres"]);

    const startDate = moment().toISOString();
    const endDate = moment().startOf("week").toISOString();

    const { rows: deliveredByLead } = await knex.raw(
      `select count(inact.id), inact.lead_id from activities inact where  activity_date >= '${startDate}' and activity_date < '${endDate}' and activity_type_id=7  group by inact.lead_id;`
    );

    const { rows: openedByLead } = await knex.raw(
      `select count(inact.id), inact.lead_id from activities inact where  activity_date >= '${startDate}' and activity_date < '${endDate}' and activity_type_id=10 and (select count("id") from activities oact where activity_type_id=7 and oact.lead_id = inact.lead_id and oact."campaignRunId" = inact."campaignRunId" ) > 0 group by inact.lead_id;`
    );

    const { rows: clickedbyLead } = await knex.raw(
      `select count(inact.id), inact.lead_id from activities inact where  activity_date >= '${startDate}' and activity_date < '${endDate}' and activity_type_id=11 and (select count("id") from activities oact where activity_type_id=7 and oact.lead_id = inact.lead_id and oact."campaignRunId" = inact."campaignRunId" ) > 0 group by inact.lead_id;`
    );

    await knex.raw(
      `update "activities" set program_id = programs.id from programs where split_part("activities".primary_attribute_value,'.',1) = programs.name and "activities".primary_attribute_value IS NOT NULL;`
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
        unique_id: `${item.lead_id}-${moment(startDate).format(
          "YYYY-MM-DD"
        )}-${endDate.format("YYYY-MM-DD")}`,
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

const moment = require("moment");
const request = require("superagent");
const Marketo = require("../../helpers/marketo");
const Knex = require("../../helpers/knex_pg");

let knex;
module.exports = async function Run(integrationMap) {
  try {
    const knex = Knex(integrationMap["postgres"]);

    const programs = await knex.table("programs").select("id", "name");

    let programsMap = {};
    programs.forEach((item) => {
      programsMap[item.name] = item.id;
    });

    const activities = await knex
      .table("activities")
      .select("id", "primary_attribute_value", "marketoGUID")
      .orderBy("activity_date", "DESC")
      .whereNull("program_id");

    activities.forEach((activity) => {
      if (activity.primary_attribute_value)
        activity.program_id =
          programsMap[activity.primary_attribute_value.split(".")[0]];
    });

    var i,
      j,
      temparray,
      chunk = 500;
    for (i = 0, j = activities.length; i < j; i += chunk) {
      temparray = activities.slice(i, i + chunk);
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
