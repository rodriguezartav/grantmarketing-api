require("dotenv").config();
const util = require("util");
const sms = require("../../helpers/sms");
const moment = require("moment");

async function Run() {
  console.log("START", moment().utcOffset("-0600").format("YYYY-MM-DD HH:mm"));
  try {
    let users = JSON.parse(process.env.USERS);
    let scriptPath = process.env.SCRIPT;
    const integrationMap = JSON.parse(process.env.INTEGRATION_MAP);
    console.log(scriptPath);
    const script = require("../" + scriptPath);

    const timeStart = moment();
    console.log(timeStart);
    /*
    setInterval(() => {
      const now = moment();
      if (now.diff(timeStart, "seconds") > 60 * 5 * 1000)
        throw new Error("Script Timeout");
    }, 1000);
*/
    console.log(
      "SCRIPT_START",
      moment().utcOffset("-0600").format("YYYY-MM-DD HH:mm")
    );
    await script(integrationMap, users);
    console.log("END", moment().utcOffset("-0600").format("YYYY-MM-DD HH:mm"));
    process.exit(0);
  } catch (e) {
    console.error(
      "SCRIPT_ERROR",
      moment().utcOffset("-0600").format("YYYY-MM-DD HH:mm")
    );
    console.error(e);
    console.log("END", moment().utcOffset("-0600").format("YYYY-MM-DD HH:mm"));
    process.exit(1);
  }
}

module.exports = Run;

if (process.argv[1].indexOf("tests") == -1) Run();
