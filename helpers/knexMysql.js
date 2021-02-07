var knexfile = require("../knexfile");

var Knex;

function getKnex() {
  if (!Knex) Knex = prepareKnex();
  return Knex;
}

function prepareKnex() {
  return require("knex")({
    debug: false,
    client: "mysql2",
    connection: {
      host: "db.production.efactura.io",
      user: "root",
      password: "2wsxzaq1",
      database: "rodco",
      charset: "utf8mb4",
      timezone: "UTC",
      typeCast: function (field, next) {
        if (field.type == "DATETIME" || field.type == "TIMESTAMP") {
          return moment(field.string()).format("YYYY-MM-DD HH:mm:ss");
        }
        if (field.type == "NEWDECIMAL" || field.type == "LONG") {
          var value = field.string();
          if (!value || value == "") return null;
          return parseFloat(value);
        }
        if (field.type == "DATE") {
          var value = field.string();
          if (!value || value == "") return null;
          return moment(value).format("YYYY-MM-DD");
        }
        if (next) return next();
        else return field.toString();
      },
    },
  });
}

module.exports = getKnex;
