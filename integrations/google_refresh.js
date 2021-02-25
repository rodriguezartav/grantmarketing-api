const Knex = require("../helpers/knex");
const moment = require("moment");
const request = require("superagent");

async function Run(integration) {
  try {
    const integration_tokens = await Knex()
      .table("integration_tokens")
      .select()
      .join("providers", "providers.id", "integration_tokens.provider_id")
      .where("providers.name", "google")
      .first();

    let response = await request
      .post("https://oauth2.googleapis.com/token")
      .send({
        grant_type: "refresh_token",
        refresh_token: integration.refresh_token,
        client_id: integration_tokens.client_id,
        client_secret: integration_tokens.client_secret,
      });

    await Knex()
      .table("integrations")
      .update({
        auth_token: response.body.access_token,
        refresh_token: response.body.refresh_token,
        expiry_date: moment().add(response.body.expires_in, "seconds"),
      })
      .where("id", integration.id);
  } catch (e) {
    console.log(e);

    await Knex()
      .table("integrations")
      .update({
        auth_token: "",
        expiry_date: null,
      })
      .where("id", integration.id);
    throw e;
  }
}

(async function () {
  try {
    await Run(JSON.parse(process.argv[2]));
    process.exit(0);
  } catch (e) {
    console.log(
      "REFRESH_ERROR",
      moment().utcOffset("-0600").format("YYYY-MM-DD HH:mm")
    );
    console.error(e);
    console.error(
      "CRITICAL_ERROR",
      moment().utcOffset("-0600").format("YYYY-MM-DD HH:mm")
    );
    s;
    Knex().destroy();
    process.exit(1);
  }
})();
