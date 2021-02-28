require("dotenv").config();
const util = require("util");
const moment = require("moment");
const sms = require("../helpers/sms");
const IntegrationMap = require("../scripts/helpers/integrationMap");

const Knex = require("../helpers/knex");
const Runner = require("../scripts/helpers/runner");

async function Test() {
  try {
    const knex = Knex();

    const integrationMap = await IntgrationMap(knex, 8);

    process.env.INTEGRATION_MAP = JSON.stringify(integrationMap);
    process.env.SCRIPT = "google/ads";
    process.env.USERS = JSON.stringify([]);

    await Runner();
  } catch (e) {
    console.error("CRITICAL_ERROR");
    console.error(e);

    throw e;
  }
}

(async function () {
  try {
    await Test();
    await Knex().destroy();

    process.exit(0);
  } catch (e) {
    console.error(e);
    await Knex().destroy();
    process.exit(1);
  }
})();
