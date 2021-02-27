require("dotenv").config();
const moment = require("moment");
const sms = require("../helpers/sms");
const HerokuRunner = require("./helpers/herokuRunner");
const Knex = require("../helpers/knex");
const AWS = require("aws-sdk");
var s3 = new AWS.S3();

(async function () {
  var knex;

  try {
    knex = Knex();

    let jobs = await knex
      .table("jobs")
      .select(
        "jobs.*",
        "scripts.name as script_name",
        "scripts.location as script_location"
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
          "JOB_START",
          job.id,
          moment().utcOffset("-0600").format("YYYY-MM-DD HH:mm")
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

        console.log("HEROKU START");

        let { url, log } = await HerokuRunner(
          integrationMap,
          job.script_location,
          users,
          job.script_options
        );

        console.log("HEROKU END", url);

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

        const admin = await knex
          .table("admins")
          .select()
          .where("id", 1)
          .first();

        if (log.indexOf("SCRIPT_ERROR") > -1) {
          await sms(url, admin.country_code + admin.phone);
        }

        console.log(
          "JOB_END",
          job.id,
          moment().utcOffset("-0600").format("YYYY-MM-DD HH:mm")
        );
      } catch (e) {
        console.log(
          "JOB CRITICAL_ERROR",
          moment().utcOffset("-0600").format("YYYY-MM-DD HH:mm")
        );
        console.error(e);
      }
    }

    await knex.destroy();
    process.exit(0);
  } catch (e) {
    if (knex) await knex.destroy();
    console.error(
      "JOBRUNNER CRITICAL_ERROR",
      moment().utcOffset("-0600").format("YYYY-MM-DD HH:mm")
    );
    console.error(e);
    process.exit(1);
  }
})();
