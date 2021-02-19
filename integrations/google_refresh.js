const Knex = require("../helpers/knex");
const moment = require("moment");
const request = require("superagent");

async function Run(integration) {
  try {
    let response = await request
      .post("https://oauth2.googleapis.com/token")
      .form()
      .send({
        grant_type: "refresh_token",
        refresh_token: integration.refresh_token,
        client_id: integration.client_id,
        client_secret: integration.client_secret,
      })
      .type("form");

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
    Knex().destroy();
    process.exit(1);
  }
})();
