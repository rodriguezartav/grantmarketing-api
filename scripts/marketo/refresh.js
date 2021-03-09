const Knex = require("../../helpers/knex");
const moment = require("moment");
const request = require("superagent");

async function Run(integration) {
  try {
    const url = `${integration.application_id.replace(
      "/rest",
      "/identity"
    )}/oauth/token?grant_type=client_credentials&client_id=${
      integration.client_id
    }&client_secret=${integration.client_secret}`;

    let response = await request.get(url);

    await Knex()
      .table("integrations")
      .update({
        auth_token: response.body.access_token,
        refresh_token: response.body.access_token,
        external_user_id: response.body.scope,
        expiry_date: moment().add(3600, "seconds"),
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
    console.error("CRITICAL_ERROR");

    console.error(e);
    Knex().destroy();
    process.exit(1);
  }
})();
