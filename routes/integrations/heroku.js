var express = require("express");
var router = express.Router();
const JWT = require("../../helpers/jwt");
const Knex = require("../../helpers/knex");
const moment = require("moment");
const superagent = require("superagent");
const jwt_decode = require("jwt-decode");
const { TenNinetyNineContact } = require("xero-node");

router.post("/webhook", async function (req, res, next) {
  console.log(req.body);
  return res.json({});
});

module.exports = router;
