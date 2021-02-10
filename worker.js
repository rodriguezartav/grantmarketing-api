const util = require("util");
const execFile = util.promisify(require("child_process").execFile);
const moment = require("moment");
const sms = require("./helpers/sms");
require("dotenv").config();

const Knex = require("./helpers/knex");

setInterval(async () => {
  try {
    const knex = Knex();

    let jobs = await knex
      .table("jobs")
      .select(
        "jobs.*",
        "scripts.name as script_name",
        "scripts.location as script_location",
        "admins.phone as admin_phone"
      )
      .join("customers", "customers.id", "jobs.customer_id")
      .join("scripts", "scripts.id", "jobs.script_id")
      .join("schedules", "schedules.id", "jobs.schedule_id")
      .join("admins", "admins.id", "schedules.admin_id")
      .where("status", "pending")
      .whereNotNull("scripts.location");

    for (let index = 0; index < jobs.length; index++) {
      const job = jobs[index];
      await knex
        .table("jobs")
        .update({ status: "working" })
        .where("id", job.id);

      const { stdout, stderr, error } = await execFile("node", [
        `./scripts/${job.script_location}/${job.script_name}.js`,
        "customer_id=" + job.customer_id,
      ]);

      await knex.table("jobs").delete().where("id", job.id);
      if (error) {
        await knex.table("script_logs").insert({
          script_id: job.script_id,
          job_id: job.id,
          log: {
            stderr: stderr || "",
            error: { stack: error.stack, message: err.stack },
          },
        });

        await sms(error.message.substring(0, 35), job.admin_phone);
      } else
        await knex
          .table("schedules")
          .update({ last_run: moment() })
          .where("id", job.schedule_id);
    }
  } catch (e) {
    console.error("CRITICAL_ERROR");
    console.error(e);
    throw e;
  }
}, 60000);

setInterval(async () => {
  try {
    const knex = Knex();

    let schedules = await knex.table("schedules").select();
    for (let index = 0; index < schedules.length; index++) {
      const schedule = schedules[index];

      const existingJobs = await knex
        .table("jobs")
        .whereIn("status", ["pending", "working"])
        .where("schedule_id", schedule.id);

      if (
        existingJobs.length == 0 &&
        moment(schedule.last_run || "1970-01-01")
          .add(schedule.period_in_minutes, "minutes")
          .unix() < moment().unix()
      ) {
        await knex.table("jobs").insert({
          status: "pending",
          schedule_id: schedule.id,
          script_id: schedule.script_id,
          customer_id: schedule.customer_id,
        });
      }
    }
  } catch (e) {
    console.error("CRITICAL_ERROR");
    console.error(e);
    throw e;
  }
}, 30 * 1000);
