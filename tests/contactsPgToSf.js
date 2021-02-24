require("dotenv").config();
const util = require("util");
const execFile = util.promisify(require("child_process").execFile);
const moment = require("moment");
const sms = require("../helpers/sms");

const Knex = require("../helpers/knex");
const Run = require("../scripts/rodco/contactsPgToSf");

async function Test(integrationMap) {
  try {
    const knex = Knex();

    const integrations = await knex
      .table("integrations")
      .select()
      .where({ customer_id: 1 });

    let integrationMap = {};
    integrations.forEach((item) => (integrationMap[item.provider_name] = item));

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