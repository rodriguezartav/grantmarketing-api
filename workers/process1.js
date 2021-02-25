require("dotenv").config();
const util = require("util");
const execFile = util.promisify(require("child_process").execFile);
const moment = require("moment");
const sms = require("../helpers/sms");
const HerokuRunner = require("./helpers/herokuRunner");
const Knex = require("../helpers/knex");
let knex;

async function Run() {
  try {
    knex = Knex();

    let jobs = await knex
      .table("jobs")
      .select(
        "jobs.*",
        "scripts.name as script_name",
        "scripts.location as script_location",
        "admins.phone as admin_phone",
        "admins.country_code as admin_country_code"
      )
      .join("customers", "customers.id", "jobs.customer_id")
      .join("scripts", "scripts.id", "jobs.script_id")
      .join("schedules", "schedules.id", "jobs.schedule_id")
      .join("admins", "admins.id", "schedules.admin_id")
      .whereNotNull("scripts.location")
      .where("status", "pending");

    for (let index = 0; index < jobs.length; index++) {
      const job = jobs[index];
      try {
        await knex
          .table("jobs")
          .update({ status: "working" })
          .where("id", job.id);

        const integrations = await knex
          .table("integrations")
          .select()
          .where({ customer_id: job.customer_id });

        let integrationMap = {};
        integrations.forEach(
          (item) => (integrationMap[item.provider_name] = item)
        );

        let tryError = null;
        let resultLog = [];
        try {
          let index = 0;
          resultLog = await HerokuRunner(integrationMap, job.script_location);
        } catch (e) {
          tryError = e;
        }

        await knex.table("executions").insert({
          schedule_id: job.schedule_id,
          result: tryError ? 1 : 0,
        });

        await knex.table("jobs").delete().where("id", job.id);

        await knex.table("script_logs").insert({
          script_id: job.script_id,
          job_id: job.id,
          log: {
            error: tryError
              ? { message: tryError.message, stack: tryError.stack }
              : null,
            lines: resultLog,
          },
        });

        if (tryError) {
          await sms(
            tryError.message.substring(0, 35),
            job.admin_country_code + job.admin_phone
          );
        } else
          await knex
            .table("schedules")
            .update({ last_run: moment() })
            .where("id", job.schedule_id);
      } catch (e) {
        console.error("JOB_CRITICAL_ERROR");
        console.error(e);
      }
    }
    await knex.destroy();
  } catch (e) {
    if (knex) await knex.destroy();
    console.error("CRITICAL_ERROR");
    console.error(e);
    throw e;
  }
}

Run();
