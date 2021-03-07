var express = require("express");
var router = express.Router();
const JWT = require("../../helpers/jwt");
const Knex = require("../../helpers/knex");
const moment = require("moment");
const superagent = require("superagent");
const jwt_decode = require("jwt-decode");

const knex = Knex();

router.post("/", async function (req, res, next) {
  return res.json({});
});

module.exports = router;
