const parsePgConnStr = require("pg-connection-string").parse;
let pg = require("pg");
var Knex;

function getKnex(integration) {
  if (!Knex) Knex = prepareKnex(integration);
  return Knex;
}

function prepareKnex(integration) {
  console.log("creating customer connection");

  process.on("beforeExit", async (code) => {
    console.log("closing customer connection");

    await Knex.destroy();
  });

  return require("knex")({
    client: "pg",
    pool: { min: 1, max: 1 },
    connection: {
      ...parsePgConnStr(integration.client_secret),
      dialectOptions: {
        ssl: {
          require: true,
          // Ref.: https://github.com/brianc/node-postgres/issues/2009
          rejectUnauthorized: false,
        },
        keepAlive: true,
      },
      max: 1,
      ssl: {
        require: true,
        // Ref.: https://github.com/brianc/node-postgres/issues/2009
        rejectUnauthorized: false,
      },
    },
  });
}

module.exports = getKnex;

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
