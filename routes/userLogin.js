var express = require("express");
var router = express.Router();
var JWT = require("../helpers/jwt");
var getKnex = require("../helpers/knex");
var moment = require("moment");
// Home page route.
router.get("/", function (req, res) {
  res.send({ result: [] });
});

router.post("/getCode", async function (req, res, next) {
  try {
    var user = await getCode({
      phone: req.body.phone,
      countryCode: req.body.countryCode,
    });

    if (user) return res.send({ succes: true });
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
    const { code, phone } = req.body;
    if (!req.body.code || parseInt(req.body.code) > 0 == false) {
      await sms(
        "Login Error Code and Phone are required " + JSON.stringify(req.body),
        "+50684191862"
      );

      return next({ status: 400, message: "Code and Phone are required" });
    }

    let filter = {
      code: req.body.code,
    };
    if (req.body.phone.indexOf("@") > --1) filter.email = req.body.phone;
    else
      filter = {
        code: req.body.code,
        phone: req.body.phone,
        country_code: req.body.countryCode,
      };

    const user = await getKnex()
      .table("users")
      .select("users.*", "customers.name as customer_name")
      .where(filter)
      .join("customers", "customers.id", "users.customer_id")
      .first();

    if (user) {
      user.timestamp = moment().valueOf();
      try {
        await getKnex()
          .table("users")
          .update({ code: null })
          .where({ id: user.id });
      } catch (e) {
        return next({ status: 401, message: e.message });
      }

      return res.send({
        id: user.id,
        customer_id: user.customer_id,
        customer_name: user.customer_name,
        name: user.name,
        token: JWT.encode(user),
      });
    } else if (!user) {
      await sms("Auth Error " + JSON.stringify(req.body), "+50684191862");
      return next({ status: 403, message: "The code is not correct" });
    }
  } catch (e) {
    return next(e);
  }
});

module.exports = router;

async function getCode({ phone, countryCode }) {
  const filter = {};

  if (phone.indexOf("*") > -1) filter = { email: phone };
  else filter = { phone: phone, country_code: countryCode };

  var user = await getKnex().table("users").where(filter).first();
  if (user) {
    let code = parseInt(Math.random() * 100000);
    await await getKnex()
      .table("users")
      .update({ code: code })
      .where({ id: user.id });

    //Sends email if it's not testing/developing

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const client = require("twilio")(accountSid, authToken);

    await client.messages
      .create({
        body: `Hi ${user.name},\n Your JD login code is: ${code}`,
        from: process.env.TWILIO_NUMBER,
        to: user.country_code + phone,
      })
      .then((message) => console.log(message.sid));
  }
  return user;
}
