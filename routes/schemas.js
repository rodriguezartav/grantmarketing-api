var express = require("express");
var router = express.Router();
const fs = require("fs");
const Knex = require("../helpers/knex");

router.get("/", async function (req, res) {
  const knex = req.knexPg || Knex();

  const tables = await knex("pg_catalog.pg_tables")
    .select("tablename")
    .where({ schemaname: "public" });

  return res.send(
    tables
      .map((item) => item.tablename)
      .filter((item) => item.indexOf("knex") == -1)
  );
});

// Home page route.
router.get("/:name", function (req, res) {
  fs.exists("./schemas/" + req.params.name + ".json", async (exists) => {
    if (exists) res.send(require("../schemas/" + req.params.name + ".json"));
    else {
      const knex = req.knexPg || Knex();
      const columns = await knex.table(req.params.name).columnInfo();
      const standardColumns = transformColumns(columns);
      const response = {
        $id: `http://jungledynamics.com/schemas/${req.params.name}`,
        title: req.params.name,
        description: "Auto Generat",
        required: [],
        properties: standardColumns,
        type: "object",
        list: Object.keys(standardColumns),
        additionalProperties: true,
      };

      return res.send(response);
    }
  });
});

module.exports = router;

function transformColumns(columns) {
  const keys = Object.keys(columns);
  const standardColumns = {};
  keys.forEach((key) => {
    standardColumns[key] = transformColumn(key, columns[key]);
  });
  return standardColumns;
}

function transformColumn(key, column) {
  const map = {
    integer: "number",
    text: "string",
    "timestamp without time zone": "datetime",
    timestamp: "datetime",
    date: "date",
  };
  const type = map[column.type] || "string";
  return { type: type };
}
