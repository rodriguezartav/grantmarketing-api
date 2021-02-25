require("dotenv").config();
const util = require("util");
const moment = require("moment");
const sms = require("../helpers/sms");

const Knex = require("../helpers/knex");
const Runner = require("../scripts/helpers/runner");

async function Test() {
  try {
    const knex = Knex();

    const integrations = await knex
      .table("integrations")
      .select("integrations.*", "providers.name as provider")
      .join("providers", "providers.id", "integrations.provider_id")
      .where({ customer_id: 8 });

    const integrationToken = await Knex()
      .table("integration_tokens")
      .select("integration_tokens.*", "providers.name as provider")
      .join("providers", "providers.id", "integration_tokens.provider_id")
      .where("providers.name", "google")
      .first();

    let integrationMap = {};
    integrations.forEach((item) => {
      integrationMap[item.provider] = item;
      integrationMap[item.provider].client_id = integrationToken.client_id;
      integrationMap[item.provider].client_secret =
        integrationToken.client_secret;
    });

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
