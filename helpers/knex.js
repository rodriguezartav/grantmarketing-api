var knexfile = require("../knexfile");
const { KnexTimeoutError } = require("knex");

var Knex;

function getKnex() {
  if (!Knex) Knex = prepareKnex();
  return Knex;
}

function prepareKnex() {
  console.log("creating connection");
  process.on("beforeExit", async (code) => {
    console.log("closing connection");
    await Knex.destroy();
  });
  return require("knex")(knexfile[process.env.NODE_ENV || "development"]);
}

module.exports = getKnex;
