//
// This file runs standalone as a node script in a heroku one-of process - opts are passed via env vars
//

require("dotenv").config();
const sms = require("../../helpers/sms");
const moment = require("moment");
const request = require("superagent");

(function () {
  if (process.env.TEST) return;
  var old = console.log;
  console.log = function () {
    if (
      arguments[0] &&
      typeof arguments[0] == "string" &&
      arguments[0].indexOf("API_EVENT") != 0
    ) {
      let initiator = "unknown place";
      try {
        throw new Error();
      } catch (e) {
        if (typeof e.stack === "string") {
          let isFirst = true;
          for (const line of e.stack.split("\n")) {
            const matches = line.match(/^\s+at\s+(.*)/);
            if (matches) {
              if (!isFirst) {
                // first line - current function
                // second line - caller (what we are looking for)
                initiator = matches[1];
                break;
              }
              isFirst = false;
            }
          }
        }
      }

      old.apply(this, [
        "API_EVENT:::SCRIPT:::LOGS:::" +
          JSON.stringify({
            job_id: process.env.JOB_ID,
            scriptPath: process.env.SCRIPT,
            line: initiator,
            message: arguments,
            time: moment().valueOf(),
            cr: moment().utcOffset("-0600").format("YYYY-MM-DD HH:mm"),
          }),
      ]);
    } else old.apply(this, arguments);
  };
})();

async function Run() {
  const job_id = process.env.JOB_ID;

  try {
    let scriptOptions = process.env.SCRIPT_OPTIONS || "{}";
    let users = JSON.parse(process.env.USERS || "[]");
    let scriptPath = process.env.SCRIPT;
    const integrationMap = JSON.parse(process.env.INTEGRATION_MAP);
    scriptOptions = JSON.parse(scriptOptions);

    console.log(
      `API_EVENT:::SCRIPTRUNNER:::START:::${JSON.stringify({
        job_id: job_id,
        scriptPath,
        time: moment().valueOf(),
      })}`
    );

    const script = require("../" + scriptPath);
    await script(integrationMap, users, scriptOptions, job_id);

    console.log(
      `API_EVENT:::SCRIPTRUNNER:::END:::${JSON.stringify({
        job_id: job_id,
        scriptPath,
        time: moment().valueOf(),
      })}`
    );

    if (!process.env.TIME_TO_LIVE) process.exit(0);
  } catch (e) {
    console.log(
      `API_EVENT:::SCRIPTRUNNER:::ERROR:::${JSON.stringify({
        job_id: job_id,
        scriptPath: process.env.SCRIPT,
        error: { message: e.message, stack: e.stack },
        time: moment().valueOf(),
      })}`
    );

    process.exit(1);
  }
}

module.exports = Run;

//hack for tests - ignore in production
if (process.argv[1].indexOf("tests") == -1) Run();
