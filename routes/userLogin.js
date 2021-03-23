var express = require("express");
var router = express.Router();
var JWT = require("../helpers/jwt");
var getKnex = require("../helpers/knex");
var moment = require("moment");
var sms = require("../helpers/sms");
// Home page route.
router.get("/", function (req, res) {
  res.send({ result: [] });
});

router.post("/getCode", async function (req, res, next) {
  try {
    var users = await getCode({
      phone: req.body.phone,
      countryCode: req.body.countryCode,
    });

    if (users) return res.send(users);
    else {
      await sms("Login Error " + JSON.stringify(req.body), "+50684191862");
      return next({ status: 403, message: "Phone is not registered" });
    }
  } catch (e) {
    return next(e);
  }
});
//
router.post("/autenticate", async function (req, res, next) {
  try {
    const { code, phone, customer_id, countryCode } = req.body;
    if (!req.body.code || parseInt(req.body.code) > 0 == false) {
      await sms(
        "Login Error Code and Phone are required " + JSON.stringify(req.body),
        "+50684191862"
      );

      return next({ status: 400, message: "Code and Phone are required" });
    }

    let filter = {
      code: code,
      phone: phone,
      country_code: countryCode,
      customer_id: customer_id,
    };

    const user = await getKnex()
      .table("users")
      .select("users.*", "customers.name as customer_name")
      .join("customers", "customers.id", "users.customer_id")
      .where(filter)
      .first();

    await getKnex().table("users").update({ code: null }).where({
      code: code,
      phone: phone,
      country_code: countryCode,
    });

    if (user) {
      user.timestamp = moment().valueOf();
      return res.send({
        id: user.id,
        customer_id: user.customer_id,
        customer_name: user.customer_name,
        name: user.name,
        token: JWT.encode(user),
      });
    } else {
      await sms("Auth Error " + JSON.stringify(req.body), "+50684191862");
      return next({ status: 403, message: "The code is not correct" });
    }
  } catch (e) {
    return next(e);
  }
});

module.exports = router;

async function getCode({ phone, countryCode }) {
  let filter = { phone: phone, country_code: countryCode };

  var users = await getKnex()
    .table("users")
    .select(
      "users.id",
      "users.name",
      "country_code",
      "users.phone",
      "users.customer_id",
      "customers.name as customer_name"
    )
    .join("customers", "customers.id", "users.customer_id")
    .where(filter);

  if (users.length > 0) {
    let code = parseInt(Math.random() * 100000);
    await await getKnex()
      .table("users")
      .update({ code: code })
      .whereIn(
        "id",
        users.map((user) => user.id)
      );

    //Sends email if it's not testing/developing

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const client = require("twilio")(accountSid, authToken);

    const user = users[0];

    await client.messages.create({
      body: `Hi ${user.name},\n Your JD login code is: ${code}`,
      from: process.env.TWILIO_NUMBER,
      to: user.country_code + user.phone,
    });
    return users;
  }
  return false;
}
