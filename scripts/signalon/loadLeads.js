const moment = require("moment");
const { xeroApi, redis } = require("../../helpers/xero");
const { sfConn, bulk, query,loginWithPassword } = require("../../helpers/sf");
const getKnex = require("../../helpers/knex_pg");
const Knex = require("../../helpers/knex_pg");

module.exports = async function Run(integrationMap) {
  const conn = await sfConn(integrationMap["salesforce_soap"]);
  await loginWithPassword(conn,integrationMap["salesforce_soap"])
  const knex = Knex(integrationMap["postgres"]);

 
  const leads = await query(
    conn,
    "select id,firstname from lead limit 100"
  );
  

  var i,
  j,
  temparray,
  chunk = 500;
for (i = 0, j = leads.length; i < j; i += chunk) {
  temparray = leads.slice(i, i + chunk).map((lead) => {
    return {
      first_name:lead.firstname,
      sf_id: lead.id

    };
  });
  await knex
    .table("leads")
    .insert(temparray)
    .onConflict("sf_id")
    .merge();
}
};
