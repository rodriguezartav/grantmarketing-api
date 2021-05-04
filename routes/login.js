var express = require("express");
var router = express.Router();
var JWT = require("../helpers/jwt");
const sms = require("../helpers/sms");

const LoginService = require("../services/login");
// Home page route.
router.get("/", function (req, res) {
  res.send({ result: [] });
});

router.post("/getCode", async function (req, res, next) {
  try {
    var login = new LoginService();
    var user = await login.getCode({
      phone: req.body.phone,
      countryCode: req.body.countryCode,
    });

    if (user) return res.send({ success: true });
    else {
      await sms("Login Error " + JSON.stringify(req.body), "+50684191862");
      return next({
        status: 404,
        message: "Phone is not registered. create account?",
      });
    }
  } catch (e) {
    return next(e);
  }
});
//
router.post("/autenticate", async function (req, res, next) {
  try {
    var login = new LoginService();

    if (!req.body.code || parseInt(req.body.code) > 0 == false)
      return next({ status: 400, message: "Debe enviar un codigo" });

    const { user } = await login.authenticate({
      applicationSid: req.body.applicationSid,
      code: req.body.code,
      countryCode: req.body.countryCode,
      phone: req.body.phone,
      endpoint: req.body.endpoint,
    });
    if (!user) {
      await sms("Auth Error " + JSON.stringify(req.body), "+50684191862");
      return next({ status: 403, message: "The code is not correct" });
    }

    return res.send({
      token: JWT.encode(user),
    });
  } catch (e) {
    return next(e);
  }
});

module.exports = router;
