var express = require("express");
var router = express.Router();
const JWT = require("../../helpers/jwt");
const Knex = require("../../helpers/knex");
const moment = require("moment");
const superagent = require("superagent");
const jwt_decode = require("jwt-decode");
const { TenNinetyNineContact } = require("xero-node");

router.post("/webhook", async function (req, res, next) {
  const { exit_status, command, name } = req.body.data;
  const action = req.body.sta;
  console.log(action, exit_status, command.split("job_id=")[1], name);
  return res.json({});
});

module.exports = router;
