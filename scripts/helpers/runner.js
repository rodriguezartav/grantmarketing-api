require("dotenv").config();
const util = require("util");
const sms = require("../../helpers/sms");
const moment = require("moment");

async function Run() {
  console.log(
    "SCRIPT_START",
    moment().utcOffset("-0600").format("YYYY-MM-DD HH:mm")
  );
  try {
    let users = JSON.parse(process.env.USERS);
    let scriptPath = process.env.SCRIPT;
    const integrationMap = JSON.parse(process.env.INTEGRATION_MAP);
    const scriptOptions = JSON.parse(process.env.SCRIPT_OPTIONS || "{}");
    console.log(scriptPath);
    const script = require("../" + scriptPath);

    /*
    setInterval(() => {
      const now = moment();
      if (now.diff(timeStart, "seconds") > 60 * 5 * 1000)
        throw new Error("Script Timeout");
    }, 1000);
*/

    await script(integrationMap, users, scriptOptions);
    console.log(
      "SCRIPT_END",
      moment().utcOffset("-0600").format("YYYY-MM-DD HH:mm")
    );
    process.exit(0);
  } catch (e) {
    console.error(
      "SCRIPT_ERROR",
      moment().utcOffset("-0600").format("YYYY-MM-DD HH:mm")
    );
    console.error(e);
    console.log(
      "SCRIPT_END",
      "WITH_ERROR",
      moment().utcOffset("-0600").format("YYYY-MM-DD HH:mm")
    );
    process.exit(1);
  }
}

module.exports = Run;

if (process.argv[1].indexOf("tests") == -1) Run();
