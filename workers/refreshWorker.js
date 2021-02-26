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
      .select("integrations.*", "providers.name as provider")
      .join("providers", "providers.id", "integrations.provider_id")
      .whereNotNull("refresh_token")
      .where("expiry_date", "<", moment());

    const integrationTokens = await Knex()
      .table("integration_tokens")
      .select("integration_tokens.*", "providers.name as provider")
      .join("providers", "providers.id", "integration_tokens.provider_id");

    for (let index = 0; index < integrations.length; index++) {
      const integration = integrations[index];
      const integrationToken = integrationTokens.filter(
        (item) => item.provider == integration.provider
      );

      if (integrationToken && integrationToken.client_id) {
        integration.client_id = integrationToken.client_id;
        integration.client_secret = integrationToken.client_secret;
        if (!integration.application_id)
          integration.application_id = integrationToken.application_id;
      }

      if (integration.refresh_token) {
        console.log(
          "REFRESH",
          integration.provider,
          moment(integration.expiry_date).format("DD-MM-YYYY HH:MM:ss"),
          moment().format("DD-MM-YYYY HH:MM:ss")
        );

        const { stdout, stderr, error } = await execFile("node", [
          `./scripts/${integration.provider}/refresh.js`,
          JSON.stringify(integration),
        ]);

        

        console.log("REFRESH_RESULT", stdout, stderr, error || "");
        console.log("REFRESH_DONE",  moment().utcOffset("-0600").format("YYYY-MM-DD HH:mm");

      }
    }
  } catch (e) {
    console.error("REFRESH CRITICAL_ERROR");
    console.error(e);
    throw e;
  }
}, 60000);
