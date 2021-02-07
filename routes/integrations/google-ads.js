var express = require("express");
var router = express.Router();

const knex = require("../helpers/knex");
const moment = require("moment");

router.post("/callback", async function (req, res, next) {
  try {
    const integration = knex.table("integrations").select().where("");

    if (user) return res.send({ succes: true });
    else return next({ status: 403, message: "Phone is not registered" });
  } catch (e) {
    return next(e);
  }
});
//

module.exports = router;
