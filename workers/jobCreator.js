//
// This file creates Jobs - it's called from the main server App.
//

require("dotenv").config();
const moment = require("moment");

const Slack = require("../helpers/slack");
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

      console.log(
        moment(schedule.start_at),
        moment(schedule.start_at).isAfter()
      );

      if (schedule.start_at && !moment(schedule.start_at).isAfter()) {
      } else {
        if (
          existingJobs.length == 0 &&
          moment(schedule.last_run || "1970-01-01")
            .add(schedule.period_in_minutes, "minutes")
            .unix() < moment().unix()
        ) {
          const ids = await knex
            .table("jobs")
            .insert({
              status: "pending",
              script_options: schedule.script_options,
              schedule_id: schedule.id,
              script_id: schedule.script_id,
              customer_id: schedule.customer_id,
            })
            .returning("id");

          console.log(
            `API_EVENT:::JOB_CREATOR:::INSERT_JOB:::${JSON.stringify({
              job_id: ids[0],
              schedule_id: schedule.id,
              script_id: schedule.script_id,
              customer_id: schedule.customer_id,
              time: moment().valueOf(),
            })}`
          );
        }
      }
    }
  } catch (e) {
    console.error(`CRITICAL_ERROR:::${e.message}:::${e.stack}```);
    console.error(e);
    throw e;
  }
}, 30 * 1000);

setInterval(async () => {
  try {
    const knex = Knex();

    const jobs = await knex
      .table("jobs")
      .select(
        "jobs.*",
        "scripts.name as script_name",
        "customers.name as customer_name"
      )
      .join("customers", "customers.id", "jobs.customer_id")
      .join("scripts", "scripts.id", "jobs.script_id")
      .whereIn("status", ["working"]);

    const lateJobs = jobs.filter((item) => {
      if (Math.abs(moment(item.created_at).diff(moment(), "minutes")) > 30)
        return true;
      else return false;
    });

    if (lateJobs.length > 0) {
      const slack = await Slack();

      await slack.chat.postMessage({
        text: `Some jobs seem to be stuck. (${lateJobs
          .map(
            (item) =>
              `${item.script_name} ${item.customer_name} ${moment(
                item.created_at
              ).fromNow()}`
          )
          .join("\n")} `,
        channel: slack.generalChannelId,
      });
    }
  } catch (e) {
    console.error("CRITICAL_ERROR");
    console.error(e);
    throw e;
  }
}, 60 * 1000 * 5);
