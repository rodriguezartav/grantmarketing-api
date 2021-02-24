require("dotenv").config();
const util = require("util");
const moment = require("moment");
const sms = require("../../helpers/sms");

const Knex = require("../../helpers/knex");
const Run = require("../../scripts/rodco/contactsPgToSf");
const moment = require("moment");

async function Runner(runFunction) {
  const knex = Knex();

  const integrations = await knex
    .table("integrations")
    .select()
    .where({ customer_id: 1 });

  let integrationMap = {};
  integrations.forEach((item) => (integrationMap[item.provider_name] = item));

  await runFunction(integrationMap);
}

module.exports = async function (runFunction) {
  console.log("START");
  const timeStart = moment();
  setInterval(() => {
    const now = moment();
    if (now.diff(timeStart, "seconds") > 60 * 5 * 1000)
      throw new Error("Timeout");
  }, 1000);
  try {
    await Runner(runFunction);
    await Knex().destroy();
    console.log("END");
    process.exit(0);
  } catch (e) {
    await Knex().destroy();
    console.error("CRITICAL_ERROR");
    console.error(e);
    process.exit(1);
  }
};
