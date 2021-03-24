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
