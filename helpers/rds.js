const moment = require("moment");

const Knex = require("knex");

class Rds {
  constructor(accountName) {
    this.tables = {};
    this.tableColumns = {};
    this.pendingTableReviews = [];

    this.data = require("data-api-client")({
      region: "us-east-1",
      secretArn:
        "arn:aws:secretsmanager:us-east-1:182722714341:secret:rds-db-credentials/cluster-Y5CHUBPBONK3M7OHGJQSF6HUT4/root-frgDAD",
      resourceArn: `arn:aws:rds:us-east-1:182722714341:cluster:${accountName}`,
      database: "master", // default database
    });

    this.knex = Knex({ client: "pg" });
  }

  execute = async function (_knex) {
    const sql = _knex.toSQL();

    let response = await this.data.query(
      toNamedString(sql.sql),
      toNamedParams(sql.bindings)
    );
    return response.records;
  };

  registerTable = async function (tableName, sample) {
    await this.loadTable(tableName);
    await this.loadColumns(tableName, sample);
  };

  loadTable = async function (tableName) {
    const sql = `select * from information_schema.tables where table_schema='public';`;
    let result = await this.data.query(sql);
    const tableMap = {};
    result.records.forEach((item) => {
      tableMap[item.table_name] = tableName;
    });

    if (!tableMap[tableName])
      await this.data.query(`CREATE TABLE IF NOT EXISTS ${tableName} (
        id SERIAL PRIMARY KEY);`);
  };

  loadColumns = async function (tableName, sample) {
    const sql = `select * from information_schema.columns where table_schema='public' and table_name = '${tableName}';`;
    let result = await this.data.query(sql);

    const tableMap = {};
    result.records.forEach((item) => {
      let table = tableMap[item.table_name] || {
        name: item.table_name,
        columnMap: {},
      };
      table.columnMap[item.column_name] = item;
      tableMap[item.table_name] = table;
    });
    this.tableColumns = tableMap;

    const sampleKeys = Object.keys(sample);
    for (let index = 0; index < sampleKeys.length; index++) {
      const key = sampleKeys[index];
      if (!this.tableColumns[tableName].columnMap[key])
        await this.migrateColumn(tableName, key, sample[key]);
    }
  };

  migrateColumn = async function (tableName, columnName, columnValue) {
    let type = "text";
    if (columnName.indexOf("Id") > -1) {
      columnName = columnName.replace("Id", "_id");
      type = "integer";
    } else if (typeof columnValue == "number") type = "decimal(14,2)";
    else if (typeof columnValue == "boolean") type = "boolean";
    else if (moment(columnValue).isValid()) {
      type = "timestamp with time zone";
    }

    await this.data.query(
      `ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${type};`
    );

    this.tableColumns[tableName].columnMap[columnName] = {
      type: type,
      name: columnName,
    };
  };
}

function toNamedString(str) {
  let index = 1;
  while (str.indexOf("?") > -1) {
    str = str.replace("?", `:p${index}`);
    index++;
  }

  return str;
}

function toNamedParams(arr) {
  let map = {};
  arr.forEach((item, index) => {
    map[`p${index + 1}`] = item;
  });
  return map;
}

module.exports = Rds;
