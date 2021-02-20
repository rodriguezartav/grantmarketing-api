require("dotenv").config();
const util = require("util");
const execFile = util.promisify(require("child_process").execFile);
const moment = require("moment");

const Knex = require("../helpers/knex");

setInterval(async () => {
  try {
    const knex = Knex();

    let integrations = await knex
      .table("integrations")
      .select()
      .whereNotNull("refresh_token")
      .where("expiry_date", ">", moment());

    console.log(integrations);

    for (let index = 0; index < integrations.length; index++) {
      const integration = integrations[index];

      const { stdout, stderr, error } = await execFile("node", [
        `./integrations/${integration.provider_name}_refresh.js`,
        JSON.stringify(integration),
      ]);

      console.log(stdout, stderr, error);
    }
  } catch (e) {
    console.error("CRITICAL_ERROR");
    console.error(e);
    throw e;
  }
}, 60000);
