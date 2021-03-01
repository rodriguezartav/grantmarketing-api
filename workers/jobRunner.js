//
// This file is called from Job Worker - it run as a fork to keep jobWorker from crasing.
//

require("dotenv").config();
const moment = require("moment");
const sms = require("../helpers/sms");
const HerokuRunner = require("./helpers/herokuRunner");
const Knex = require("../helpers/knex");
const Slack = require("../helpers/slack");
const AWS = require("aws-sdk");
var s3 = new AWS.S3();

async function JobRunner() {
  var knex;

  try {
    knex = await Knex();
    const slack = await Slack();

    let jobs = await knex
      .table("jobs")
      .select(
        "jobs.*",
        "scripts.name as script_name",
        "scripts.location as script_location",
        "customers.name as customer_name"
      )
      .join("customers", "customers.id", "jobs.customer_id")
      .join("scripts", "scripts.id", "jobs.script_id")
      .join("schedules", "schedules.id", "jobs.schedule_id")
      .whereNotNull("scripts.location")
      .where("status", "pending");

    const integrationTokens = await Knex()
      .table("integration_tokens")
      .select("integration_tokens.*", "providers.name as provider")
      .join("providers", "providers.id", "integration_tokens.provider_id");

    const integrationTokensMap = {};
    integrationTokens.forEach((item) => {
      integrationTokensMap[item.provider] = item;
    });

    for (let index = 0; index < jobs.length; index++) {
      const job = jobs[index];
      try {
        console.log(
          `API_EVENT:::JOB_RUNNER:::START:::${JSON.stringify({
            script_location: job.script_location,
            job_id: job.id,
            time: moment().unix(),
          })}`
        );

        await knex
          .table("jobs")
          .update({ status: "working" })
          .where("id", job.id);

        const integrations = await knex
          .table("integrations")
          .select("integrations.*", "providers.name as provider")
          .join("providers", "providers.id", "integrations.provider_id")
          .where({ customer_id: job.customer_id });

        const users = await Knex()
          .table("users")
          .select()
          .where("customer_id", job.customer_id);

        let integrationMap = {};
        integrations.forEach((item) => {
          const integrationToken = integrationTokensMap[item.provider];
          if (integrationToken && item.provider == integrationToken.provider) {
            item.client_id = integrationTokensMap[item.provider].client_id;
            item.client_secret =
              integrationTokensMap[item.provider].client_secret;
            if (
              !item.application_id &&
              integrationTokensMap[item.provider].application_id
            )
              item.application_id =
                integrationTokensMap[item.provider].application_id;
          }
          integrationMap[item.provider] = item;
        });

        let { url, log } = await HerokuRunner(
          integrationMap,
          job.script_location,
          users,
          job.script_options,
          job
        );

        await knex.table("script_logs").insert({
          script_id: job.script_id,
          job_id: job.id,
          log: {
            link: url,
          },
        });

        await knex.table("jobs").delete().where("id", job.id);

        await knex
          .table("schedules")
          .update({ last_run: moment() })
          .where("id", job.schedule_id);

        if (log.indexOf("SCRIPTRUNNER:::ERROR") > -1) {
          await slack.chat.postMessage({
            text: `Error: ${job.customer_name} ${job.script_name} ${url}`,
            channel: slack.generalChannelId,
          });
        }

        console.log(
          `API_EVENT:::JOB_RUNNER:::END:::${JSON.stringify({
            script_location: job.script_location,
            job_id: job.id,
            time: moment().unix(),
          })}`
        );
      } catch (e) {
        await knex.table("jobs").delete().where("id", job.id);

        console.log(
          `API_EVENT:::JOB_RUNNER:::ERROR:::${JSON.stringify({
            job_id: job.id,
            script_location: job.script_location,
            error: { message: e.message, stack: e.stack },
            time: moment().unix(),
          })}`
        );

        console.error(e);
      }
    }

    await knex.destroy();
  } catch (e) {
    if (knex) await knex.destroy();
    console.log(
      `API_EVENT:::JOB_RUNNER:::CRITICAL_ERROR:::${JSON.stringify({
        error: { message: e.message, stack: e.stack },
        time: moment().unix(),
      })}`
    );

    console.error(e);
  }
}

module.exports = JobRunner;
