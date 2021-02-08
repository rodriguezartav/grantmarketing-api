var knexfile = require("../knexfile");

var Knex;

function getKnex() {
  if (!Knex) Knex = prepareKnex();
  return Knex;
}

function prepareKnex() {
  console.log("creating connection");
  return require("knex")(knexfile[process.env.NODE_ENV || "development"]);
}


function prepareKnex() {
  console.log("creating connection");
  return getKnex().destroy();
}


module.exports = getKnex;
