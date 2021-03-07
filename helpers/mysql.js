const parsePgConnStr = require("pg-connection-string").parse;
let mysql2 = require("mysql2");
var Knex;

function getKnex(integration) {
  if (!Knex) Knex = prepareKnex(integration);
  return Knex;
}

function prepareKnex(integration) {
  console.log("creating mysql connection");

  process.on("beforeExit", async (code) => {
    console.log("closing mysql connection");

    await Knex.destroy();
    Knex = null;
  });

  const conn = parsePgConnStr(integration.api_key);
  return require("knex")({
    client: "mysql2",

    connection: conn,
  });
}

module.exports = getKnex;
