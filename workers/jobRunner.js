//
// This file is called from Job Worker - it run as a fork to keep jobWorker from crasing.
//

require("dotenv").config();
const moment = require("moment");
const AWS = require("aws-sdk");
var s3 = new AWS.S3();
const Heroku = require("heroku-client");
const heroku = new Heroku({ token: process.env.HEROKU_API_TOKEN });

async function JobRunner(knex) {
  try {
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

    const integrationTokens = await knex
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
            time: moment().valueOf(),
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

        const users = await knex
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

        console.log(
          `API_EVENT:::HEROKU_RUNNER:::START:::${JSON.stringify({
            job_id: job.id,
            time: moment().valueOf(),
            integrationMap: Object.keys(integrationMap),
            script: script,
            scriptOptions: scriptOptions,
          })}`
        );

        await heroku.post("/apps/grantmarketing/dynos", {
          body: {
            command: `node ./scripts/helpers/runner.js job_id=${job.id}`,
            env: {
              COLUMNS: "80",
              LINES: "24",
              INTEGRATION_MAP: JSON.stringify(integrationMap),
              SCRIPT_OPTIONS: JSON.stringify(job.script_options),
              JOB_ID: job.id,
              SCRIPT: job.script_location,
              USERS: JSON.stringify(
                users.map((item) => {
                  return {
                    name: item.name,
                    id: item.id,
                    phone: item.phone,
                    email: item.email,
                  };
                })
              ),
            },
            force_no_tty: null,
            size: "Hobby.",
            type: "run",
            time_to_live: 60 * 10,
          },
        });

        console.log(
          `API_EVENT:::JOB_RUNNER:::END:::${JSON.stringify({
            script_location: job.script_location,
            job_id: job.id,
            time: moment().valueOf(),
          })}`
        );
      } catch (e) {
        console.log(
          `API_EVENT:::JOB_RUNNER:::ERROR:::${JSON.stringify({
            job_id: job.id,
            script_location: job.script_location,
            error: { message: e.message, stack: e.stack },
            time: moment().valueOf(),
          })}`
        );

        console.error(e);
      }
    }
  } catch (e) {
    console.log(
      `API_EVENT:::JOB_RUNNER:::CRITICAL_ERROR:::${JSON.stringify({
        error: { message: e.message, stack: e.stack },
        time: moment().valueOf(),
      })}`
    );

    console.error(e);
  }
}

module.exports = JobRunner;
