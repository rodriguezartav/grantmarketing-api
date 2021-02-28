//
// This file runs standalone as a node script in a heroku one-of process - opts are passed via env vars
//

require("dotenv").config();
const util = require("util");
const sms = require("../../helpers/sms");
const moment = require("moment");

async function Run() {
  const job = JSON.parse(process.env.JOB || "{}");

  try {
    let scriptOptions = process.env.SCRIPT_OPTIONS || "{}";
    console.log(scriptOptions);
    let users = JSON.parse(process.env.USERS);
    let scriptPath = process.env.SCRIPT;
    const integrationMap = JSON.parse(process.env.INTEGRATION_MAP);
    scriptOptions = JSON.parse(scriptOptions);
    console.log(scriptPath);

    console.log(
      `API_EVENT:::SCRIPTRUNNER:::START:::${JSON.stringify({
        job_id: job.id,
        time: moment(),
      })}`
    );

    const script = require("../" + scriptPath);
    await script(integrationMap, users, scriptOptions, job);

    console.log(
      `API_EVENT:::SCRIPTRUNNER:::END:::${JSON.stringify({
        job_id: job.id,
        time: moment(),
      })}`
    );

    process.exit(0);
  } catch (e) {
    console.log(
      `API_EVENT:::SCRIPTRUNNER:::END:::${JSON.stringify({
        job_id: job.id,
        time: moment(),
      })}`
    );

    console.log(
      `API_EVENT:::SCRIPTRUNNER:::ERROR:::${JSON.stringify({
        job_id: job.id,
        error: { message: e.message, stack: e.stack },
        time: moment(),
      })}`
    );

    console.error(e);

    process.exit(1);
  }
}

module.exports = Run;

//hack for tests - ignore in production
if (process.argv[1].indexOf("tests") == -1) Run();
