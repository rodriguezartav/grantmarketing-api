var express = require("express");
var router = express.Router();
const JWT = require("../../helpers/jwt");
const Knex = require("../../helpers/knex");
const moment = require("moment");

router.post("/", async function (req, res, next) {
  try {
    const knex = Knex();
    const user = req.user;
    const token = JWT.encode({
      ...user,
      expiry_date: moment().add(5000, "days"),
    });

    await knex.table("api_keys").insert({ token: token, user_id: req.user.id });
    res.send({ success: true });
  } catch (e) {
    return next(e);
  }
});

router.get("/", async function (req, res, next) {
  try {
    const knex = Knex();
    const user = req.user;
    const token = JWT.encode({
      ...user,
      expiry_date: moment().add(5000, "days"),
    });

    const keys = await knex.table("api_keys").where({ user_id: req.user.id });
    res.send(keys);
  } catch (e) {
    return next(e);
  }
});

module.exports = router;
