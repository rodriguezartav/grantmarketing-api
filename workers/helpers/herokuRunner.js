//
// This file is called from Job Runner - it's separate because it uses no DB connectios. Architecture decision.
//

require("dotenv").config();
const AWS = require("aws-sdk");
var s3 = new AWS.S3();
const https = require("https");
const fs = require("promise-fs");
const Handlebars = require("handlebars");
const moment = require("moment");

const Heroku = require("heroku-client");
const heroku = new Heroku({ token: process.env.HEROKU_API_TOKEN });

module.exports = function Run(
  integrationMap,
  script,
  users,
  scriptOptions,
  job
) {
  let promise = new Promise(async (resolve, reject) => {
  

    try {
      let logRequest
      const dynoRes = await heroku.post("/apps/grantmarketing/dynos", {
        body: {
          command: `node ./scripts/helpers/runner.js`,
          env: {
            COLUMNS: "80",
            LINES: "24",
            INTEGRATION_MAP: JSON.stringify(integrationMap),
            SCRIPT_OPTIONS: JSON.stringify(scriptOptions),
            JOB: JSON.stringify(job),
            SCRIPT: script,
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
          time_to_live: 100,
        },
      });

      console.log(
        `API_EVENT:::HEROKU_RUNNER:::START:::${JSON.stringify({
          job_id: job.id,
          time: moment().unix(),
          herokuScript_name: dynoRes.name,
          integrationMap: Object.keys(integrationMap),
          script: script,
          scriptOptions: scriptOptions,
        })}`
      );

      const timeoutInterval = setInterval(() => {
        clearInterval(timeoutInterval);
        
         await heroku.post(`/apps/${grantmarketing}/dynos/${dynoRes.name}/actions/stop`, {
          body: {},
        });  

        if(logRequest) logRequest.destroy();
 
        console.log(
          `API_EVENT:::HEROKU_RUNNER:::TIME_OUT:::${JSON.stringify({
            job_id: job.id,
            script,
            time: moment().unix(),
          })}`
        );

        reject(new Error("Script Timeout"));
      }, 1000 * 60 * 10);


      const logRes = await heroku.post("/apps/grantmarketing/log-sessions", {
        body: {
          dyno: dynoRes.name,
          tail: true,
        },
      });

      let lines = [];
       logRequest = https
        .get(logRes.logplex_url, (res) => {
          res.on("data", async (d) => {
            const line = d.toString();
            lines.push(line);
            if (line.indexOf("SCRIPTRUNNER:::END") > -1) {
              clearInterval(timeoutInterval);

              logRequest.destroy();
              const url = await saveToS3(lines, script);

              console.log(
                `API_EVENT:::HEROKU_RUNNER:::END:::${JSON.stringify({
                  job_id: job.id,
                  script,
                  time: moment().unix(),
                })}`
              );

              resolve({ url, log: lines.join(",") });
            }
          });
        })
        .on("error", (e) => {
          console.error(e);
          console.log(
            `API_EVENT:::HEROKU_RUNNER:::LOG_ERROR:::${JSON.stringify({
              job_id: job.id,
              script,
              error: {
                message: e.message,
                stack: e.stack,
                status: e.status || e.statusCode,
              },
              time: moment().unix(),
            })}`
          );
          reject(e);
        });
    } catch (e) {
      console.log(e);
      console.log(
        `API_EVENT:::HEROKU_RUNNER:::ERROR:::${JSON.stringify({
          job_id: job.id,
          script,
          error: {
            message: e.message,
            stack: e.stack,
            status: e.status || e.statusCode,
          },
          time: moment().unix(),
        })}`
      );

      reject(e);
    }
  });

  return promise;
};

async function saveToS3(lines, script) {
  const file = await fs.readFile("./workers/templates/log.html", "utf-8");

  const template = Handlebars.compile(file);
  const body = template({
    lines,
    script,
    time: moment().utcOffset("-0600").format("YYYY-MM-DD HH:mm"),
  });

  const random = parseInt(Math.random() * 10000000);
  var params = {
    Body: body,
    Bucket: "logs.jungledynamics.com",
    Key: "logs/" + random + ".html",
    ContentType: "text/html",
  };
  await s3.putObject(params).promise();
  return `https://logs.jungledynamics.com/logs/${random}.html`;
}
