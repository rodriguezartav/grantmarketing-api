require("dotenv").config();
const https = require("https");

const Heroku = require("heroku-client");
const heroku = new Heroku({ token: process.env.HEROKU_API_TOKEN });

async function Run() {
  try {
    const dynoRes = await heroku.post("/apps/grantmarketing/dynos", {
      body: {
        command: "node ./scripts/rodco/test.js",
        env: {
          COLUMNS: "80",
          LINES: "24",
        },
        force_no_tty: null,
        size: "Hobby.",
        type: "run",
        time_to_live: 100,
      },
    });
    console.log(dynoRes);

    const logRes = await heroku.post("/apps/grantmarketing/log-sessions", {
      body: {
        dyno: dynoRes.name,
        tail: true,
      },
    });

    https
      .get(logRes.logplex_url, (res) => {
        console.log("statusCode:", res.statusCode);
        console.log("headers:", res.headers);

        res.on("data", (d) => {
          console.log(d.toString());
        });
      })
      .on("error", (e) => {
        console.error(e);
      });
  } catch (e) {
    console.log(e);
  }
}

Run();
