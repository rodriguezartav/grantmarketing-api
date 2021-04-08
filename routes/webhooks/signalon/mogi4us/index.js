var express = require("express");
var router = express.Router();
const IntegrationMap = require("../../../../helpers/integrationMap");
const Knex = require("../../../../helpers/knex");
const Actions = require("./actions");

router.post("/", async function (req, res, next) {
  console.log(JSON.stringify(req.body.event.blocks));
  return res.json(req.body);
});

router.post("/command", async function ({ body }, res, next) {
  const { text, command, channel_id, response_url } = body;

  console.log(req.body);
  return res.json({ text: "ok" });
});

router.post("/actions", async function (req, res, next) {
  const body = JSON.parse(req.body.payload);
  const { callback_id, type, trigger_id, message, blocks } = body;

  await Actions[type](body, res);
});

router.post("/options", async function (req, res, next) {
  const body = JSON.parse(req.body.payload);
  console.log(body);

  const { callback_id, type, trigger_id, message, blocks } = body;

  const result = Actions[type](body);

  return res.json(result);
});

module.exports = router;
