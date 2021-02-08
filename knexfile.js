require("dotenv").config();

var moment = require("moment");

let pg = require("pg");

pg.types.setTypeParser(pg.types.builtins.INT8, (value) => {
  return parseInt(value);
});

pg.types.setTypeParser(pg.types.builtins.INT2, (value) => {
  return parseInt(value);
});

pg.types.setTypeParser(pg.types.builtins.INT4, (value) => {
  return parseInt(value);
});

pg.types.setTypeParser(pg.types.builtins.FLOAT4, (value) => {
  return parseFloat(value);
});

pg.types.setTypeParser(pg.types.builtins.FLOAT8, (value) => {
  return parseFloat(value);
});

pg.types.setTypeParser(pg.types.builtins.NUMERIC, (value) => {
  return parseFloat(value);
});

const parsePgConnStr = require("pg-connection-string").parse;

module.exports = {
  development: {
    client: "pg",

    connection: {
      ...parsePgConnStr(process.env.DATABASE_URL || ""),
      dialectOptions: {
        ssl: {
          require: true,
          // Ref.: https://github.com/brianc/node-postgres/issues/2009
          rejectUnauthorized: false,
        },
        keepAlive: true,
      },
      ssl: true,
    },
  },
  production: {
    client: "pg",
    pool: { min: 1, max: 8 },
    connection: {
      ...parsePgConnStr(process.env.DATABASE_URL || ""),
      dialectOptions: {
        ssl: {
          require: true,
          // Ref.: https://github.com/brianc/node-postgres/issues/2009
          rejectUnauthorized: false,
        },
        keepAlive: true,
      },
      
      
    },
  },
};
