require("dotenv").config();
const moment = require("moment");

const Knex = require("../helpers/knex");

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
          script_options: schedule.script_options,
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
