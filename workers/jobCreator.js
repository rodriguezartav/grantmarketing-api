require("dotenv").config();
const moment = require("moment");

const Slack = require("../helpers/slack");
const Knex = require("../helpers/knex");

setInterval(async () => {
  try {
    const knex = Knex();

    const slack = await Slack();

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
          script_options: schedule.script_options,
          schedule_id: schedule.id,
          script_id: schedule.script_id,
          customer_id: schedule.customer_id,
        });
      } else {
        const jobs = await knex
          .table("jobs")
          .select(
            "jobs.*",
            "scripts.name as script_name",
            "customers.name as customer_name"
          )
          .join("customers", "customers.id", "jobs.customer_id")
          .join("scripts", "scripts.id", "jobs.script_id")
          .whereIn("status", ["working"])
          .where("created_at", ">", moment().add(-10, "minutes"))
          .where("schedule_id", schedule.id);

        if (jobs.length > 0) {
          await slack.chat.postMessage({
            text: `Some jobs seem to be stock. ${jobs.map(
              (item) =>
                `${item.script_name} ${item.customer_name} ${item.created_at}`
            )}`,
            channel: slack.generalChannelId,
          });
        }
      }
    }
  } catch (e) {
    console.error("CRITICAL_ERROR");
    console.error(e);
    throw e;
  }
}, 30 * 1000);
