require("dotenv").config();
const util = require("util");
const execFile = util.promisify(require("child_process").execFile);
const moment = require("moment");
const sms = require("../helpers/sms");

const Knex = require("../helpers/knex");

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

      const integrations = await knex
        .table("integrations")
        .select()
        .where({ customer_id: job.customer_id });

      let integrationMap = {};
      integrations.forEach(
        (item) => (integrationMap[item.provider_name] = item)
      );

      let tryError;
      try {
        let { stdout, stderr, error } = await execFile("node", [
          `./scripts/${job.script_location}/${job.script_name}.js`,
          JSON.stringify(integrationMap),
          job.customer_id,
        ]);
        tryError = error;
      } catch (e) {
        tryError = e;
      }

      await knex.table("executions").insert({
        schedule_id: job.schedule_id,
        result: tryError ? 1 : 0,
      });

      await knex.table("jobs").delete().where("id", job.id);
      if (tryError) {
        await knex.table("script_logs").insert({
          script_id: job.script_id,
          job_id: job.id,
          log: {
            stderr: stderr || "",
            error: { stack: tryError.stack, message: tryError.stack },
          },
        });

        await sms(tryError.message.substring(0, 35), job.admin_phone);
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
}, 6000);
