require("dotenv").config();
const util = require("util");
const execFile = util.promisify(require("child_process").execFile);
const moment = require("moment");
const sms = require("../helpers/sms");
const IntegrationMap = require("../scripts/helpers/integrationMap");
const Knex = require("../helpers/knex");
const Run = require("../scripts/rodco/paymentsXeroToPg");

async function Test() {
  try {
    const knex = Knex();

    let integrationMap = await IntegrationMap(knex, 1);

    process.env.INTEGRATION_MAP = JSON.stringify(integrationMap);
    await Run(integrationMap);
  } catch (e) {
    console.error("CRITICAL_ERROR");
    console.error(e);

    throw e;
  }
}

(async function () {
  try {
    await Test();
    process.exit(0);
  } catch (e) {
    console.error(e);
    await Knex().destroy();
    process.exit(1);
  }
})();
