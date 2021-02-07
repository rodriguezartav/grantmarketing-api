var express = require("express");
var router = express.Router();
const JWT = require("../../helpers/jwt");
const Knex = require("../../helpers/knex");
const moment = require("moment");
const request = require("superagent");
const jwt_decode = require("jwt-decode");

async function Refresh() {
  try {
    const integration = await Knex()
      .table("integrations")
      .select()
      .where("provider_name", "xero")
      .where(
        "customer_id",
        parseInt(process.env.argv[2].replace("customer_id=", ""))
      )
      .first();

    let data = integration.client_id + ":" + integration.client_secret;
    let buff = Buffer.from(data);
    let base64data = buff.toString("base64");

    let response = await request
      .post("https://identity.xero.com/connect/token")
      .send({
        grant_type: "refresh_token",
        refresh_token: xero_refresh_token,
      })
      .type("form")
      .set("Authorization", "Basic " + base64data);

    let identityRes = await request
      .get("https://api.xero.com/connections")
      .set("Authorization", `Bearer ${response.body.access_token}`);

    await Knex()
      .table("integrations")
      .update({
        auth_token: response.body.access_token,
        refresh_token: response.body.refresh_token,
        expiry_date: moment().add(1500, "seconds"),
      })
      .where("id", integration.id);
  } catch (e) {}
}

Refresh();
