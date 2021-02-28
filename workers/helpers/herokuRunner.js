require("dotenv").config();
const AWS = require("aws-sdk");
var s3 = new AWS.S3();
const https = require("https");
const fs = require("promise-fs");
const Handlebars = require("handlebars");
const moment = require("moment");

const Heroku = require("heroku-client");
const heroku = new Heroku({ token: process.env.HEROKU_API_TOKEN });

module.exports = function Run(integrationMap, script, users, scriptOptions) {
  let promise = new Promise(async (resolve, reject) => {
    try {
      const dynoRes = await heroku.post("/apps/grantmarketing/dynos", {
        body: {
          command: `node ./scripts/helpers/runner.js`,
          env: {
            COLUMNS: "80",
            LINES: "24",
            INTEGRATION_MAP: JSON.stringify(integrationMap),
            SCRIPT_OPTIONS: JSON.stringify(scriptOptions),
            SCRIPT: script,
            USERS: JSON.stringify(users),
          },
          force_no_tty: null,
          size: "Hobby.",
          type: "run",
          time_to_live: 100,
        },
      });

      const logRes = await heroku.post("/apps/grantmarketing/log-sessions", {
        body: {
          dyno: dynoRes.name,
          tail: true,
        },
      });

      let lines = [];
      const logRequest = https
        .get(logRes.logplex_url, (res) => {
          res.on("data", async (d) => {
            const line = d.toString();
            lines.push(line);
            console.log(line);
            if (line.indexOf("END") > -1) {
              logRequest.destroy();
              const url = await saveToS3(lines, script);
              resolve({ url, log: lines.join(",") });
            }
          });
        })
        .on("error", (e) => {
          console.error(e);
          reject(e);
        });
    } catch (e) {
      console.log(e);
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
