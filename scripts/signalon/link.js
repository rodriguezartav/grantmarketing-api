const moment = require("moment");
const request = require("superagent");
const Marketo = require("../../helpers/marketo");
const Knex = require("../../helpers/knex_pg");

let knex;
module.exports = async function Run(integrationMap) {
  try {
    const knex = Knex(integrationMap["postgres"]);

    const activities = await knex
      .table("activities")
      .select()
      .orderBy("activity_date", "DESC")
      .limit(5000);

    const campaingList = [
      ...new Set(activities.map((item) => item.attributes["Campaign Run ID"])),
    ];

    const leadList = [...new Set(activities.map((item) => item.lead_id))];

    await knex.destroy();
    return true;
  } catch (e) {
    console.log(e);

    throw e;
  }
};
