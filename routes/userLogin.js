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
    else return next({ status: 403, message: "Phone is not registered" });
  } catch (e) {
    return next(e);
  }
});
//
router.post("/autenticate", async function (req, res, next) {
  try {
    const { code, phone } = req.body;
    if (!req.body.code || parseInt(req.body.code) > 0 == false)
      return next({ status: 400, message: "Code and Phone are required" });

    const user = await getKnex()
      .table("users")
      .select("users.*", "customers.name as customer_name")
      .where({
        code: req.body.code,
        phone: req.body.phone,
        country_code: req.body.countryCode,
      })
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
    } else if (!user) return next({ status: 403, message: "The code is not correct" });
  } catch (e) {
    return next(e);
  }
});

module.exports = router;

async function getCode({ phone }) {
  var user = await getKnex()
    .table("users")
    .where({ phone: phone, country_code: countryCode })
    .first();
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
