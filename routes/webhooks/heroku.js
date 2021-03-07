var express = require("express");
var router = express.Router();
const JWT = require("../../helpers/jwt");
const Knex = require("../../helpers/knex");
const moment = require("moment");
const superagent = require("superagent");
const jwt_decode = require("jwt-decode");
const Slack = require("../../helpers/slack");

const knex = Knex();

router.post("/", async function (req, res, next) {
  console.log(req.body.data);
  const { exit_status, command, name } = req.body.data;
  const action = req.body.data.action;
  const jobId = parseInt(command.split("job_id=")[1]);
  console.log(action, exit_status, jobId, name);
  const slack = await Slack();

  if (!jobId || exit_status == null) return res.json({});
  const job = await knex
    .table("jobs")
    .select("jobs.*", "scripts.location as script_location")
    .join("scripts", "scripts.id", "jobs.script_id")
    .where("jobs.id", jobId)
    .first();

  console.log(job);

  if (!job) {
    await slack.chat.postMessage({
      text: `Error in Job id ${jobId} not found`,
      channel: slack.generalChannelId,
    });
    return res.json({});
  }

  console.log(
    `API_EVENT:::HEROKU_RUNNER:::END:::${JSON.stringify({
      job_id: job.id,
      time: moment().valueOf(),
      herokuScript_name: name,
    })}`
  );
  await knex.table("jobs").delete().where("id", jobId);

  if (exit_status == 0) {
    await knex
      .table("schedules")
      .update({ last_run: moment() })
      .where("id", job.schedule_id);
  } else if (exit_status != 0) {
    await slack.chat.postMessage({
      text: `Error in Job id ${job.id} for script ${script_location}`,
      channel: slack.generalChannelId,
    });

    console.log(
      `API_EVENT:::HEROKU_RUNNER:::ERROR:::${JSON.stringify({
        job_id: job_id,
        time: moment().valueOf(),
      })}`
    );
  }

  return res.json({});
});

module.exports = router;
