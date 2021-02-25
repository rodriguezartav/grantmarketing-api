require("dotenv").config();

const https = require("https");

const Heroku = require("heroku-client");
const heroku = new Heroku({ token: process.env.HEROKU_API_TOKEN });

module.exports = function Run(integrationMap, script) {
  let promise = new Promise(async (resolve, reject) => {
    try {
      const dynoRes = await heroku.post("/apps/grantmarketing/dynos", {
        body: {
          command: `node ./scripts/helpers/runner.js`,
          env: {
            COLUMNS: "80",
            LINES: "24",
            INTEGRATION_MAP: JSON.stringify(integrationMap),
            SCRIPT: script,
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
          res.on("data", (d) => {
            const line = d.toString();
            lines.push(line);
            console.log(line);
            if (line.indexOf("END") > -1) {
              logRequest.destroy();
              resolve(lines);
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
