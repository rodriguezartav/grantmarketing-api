const Knex = require("../helpers/knex");
const moment = require("moment");
const request = require("superagent");

async function Run(integration) {
  try {
    const oauthRes = await superagent.get(
      `${integration.application_id}/oauth/token?grant_type=client_credentials&client_id=${integration.client_id}&client_secret=${integration.client_secret}`
    );

    await Knex()
      .table("integrations")
      .update({
        auth_token: oauthRes.body.access_token,
        refresh_token: oauthRes.body.access_token,
        expiry_date: moment().add(oauthRes.body.expires_in, "seconds"),
      })
      .where("id", integration.id);
  } catch (e) {
    console.log(e);
    await Knex()
      .table("integrations")
      .update({
        auth_token: "",
        refresh_token: "",
        expiry_date: null,
      })
      .where("id", integration.id);
  }
}

(async function () {
  try {
    await Run(JSON.parse(process.argv[2]));
    process.exit(0);
  } catch (e) {
    console.error(e);
    console.error("CRITICAL_ERROR");

    Knex().destroy();
    process.exit(1);
  }
})();
