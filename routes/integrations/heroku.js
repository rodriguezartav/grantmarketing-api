var express = require("express");
var router = express.Router();
const JWT = require("../../helpers/jwt");
const Knex = require("../../helpers/knex");
const moment = require("moment");
const superagent = require("superagent");
const jwt_decode = require("jwt-decode");
const sms = require("../../helpers/sms");

const knex = Knex();

router.post("/webhook", async function (req, res, next) {
  const { exit_status, command, name } = req.body.data;
  const action = req.body.data.action;
  const jobId = command.split("job_id=")[1];
  console.log(action, exit_status, jobId, name);

  if (!jobId) return res.json({});
  const job = await knex
    .table("jobs")
    .select("jobs.*", "scripts.location as script_location")
    .join("scripts", "script.id", "jobs.script_id")
    .where("jobs.id", jobId)
    .first();

  console.log(
    `API_EVENT:::HEROKU_RUNNER:::END:::${JSON.stringify({
      job_id: job.id,
      time: moment().valueOf(),
      herokuScript_name: name,
    })}`
  );

  await knex.table("jobs").delete().where("id", jobId);

  if (exit_status == 1) {
    await knex
      .table("schedules")
      .update({ last_run: moment() })
      .where("id", job.schedule_id);
  } else if (exit_status != 0) {
    const admin = await knex.table("jobs").select().where("id", 1);
    await sms(
      `Error in Job id ${job.id} for script ${script_location}`,
      `+${admin.country_code}${admin.phone}`
    );

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
