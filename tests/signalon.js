require("dotenv").config();
const util = require("util");
const execFile = util.promisify(require("child_process").execFile);
const moment = require("moment");
const sms = require("../helpers/sms");
process.env.TEST = true;
const Knex = require("../helpers/knex");
const Runner = require("../scripts/helpers/runner");

async function Test() {
  try {
    const knex = Knex();

    const integrations = await knex
      .table("integrations")
      .select("integrations.*", "providers.name as provider")
      .join("providers", "providers.id", "integrations.provider_id")
      .where({ customer_id: 2 });

    let integrationMap = {};
    integrations.forEach((item) => (integrationMap[item.provider] = item));

    process.env.INTEGRATION_MAP = JSON.stringify(integrationMap);
    process.env.SCRIPT = "signalon/loadPrograms";

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
    process.exit(0);
  } catch (e) {
    console.error(e);
    await Knex().destroy();
    process.exit(1);
  }
})();
