var express = require("express");
var router = express.Router();
const JWT = require("../helpers/jwt");
const Knex = require("../helpers/knex");
const moment = require("moment");
const request = require("superagent");
const jwt_decode = require("jwt-decode");

async function Run(integration) {
  try {
    let data = integration.client_id + ":" + integration.client_secret;
    let buff = Buffer.from(data);
    let base64data = buff.toString("base64");

    let response = await request
      .post("https://identity.xero.com/connect/token")
      .send({
        grant_type: "refresh_token",
        refresh_token: integration.refresh_token,
      })
      .type("form")
      .set("Authorization", "Basic " + base64data);

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
    throw e;
  }
}

(async function () {
  try {
    await Run(JSON.parse(process.argv[2]));
    process.exit(0);
  } catch (e) {
    console.error(e);
    console.error("CRITICAL_ERROR");

    await Knex().destroy();
    process.exit(1);
  }
})();
