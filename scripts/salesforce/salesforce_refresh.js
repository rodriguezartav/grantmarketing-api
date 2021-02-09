const Knex = require("../../helpers/knex");
const moment = require("moment");
const request = require("superagent");

async function Run(customer_id) {
  var integration;

  try {
    integration = await Knex()
      .table("integrations")
      .select()
      .where("provider_name", "salesforce")
      .where("customer_id", customer_id)
      .first();

    let response = await request
      .post("https://login.salesforce.com//services/oauth2/token")
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
        expiry_date: moment().add(1500, "seconds"),
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
  } finally {
    Knex().destroy();
  }
}

try {
  Run(parseInt(process.argv[2].replace("customer_id=", "")));
} catch (e) {
  console.log(e);
}
