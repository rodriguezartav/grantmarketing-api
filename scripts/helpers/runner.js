require("dotenv").config();
const util = require("util");
const sms = require("../../helpers/sms");
const moment = require("moment");

module.exports = async function (scriptPath) {
  console.log("START");
  try {
    if (!scriptPath) scriptPath = process.env.SCRIPT;
    const integrationMap = JSON.parse(process.env.INTEGRATION_MAP);
    console.log(scriptPath);
    const script = require("../" + scriptPath);

    const timeStart = moment();
    console.log(timeStart);
    setInterval(() => {
      const now = moment();
      if (now.diff(timeStart, "seconds") > 60 * 5 * 1000)
        throw new Error("Timeout");
    }, 1000);

    console.log("SCRIPT_START");
    await script(integrationMap);
    console.log("END");
    process.exit(0);
  } catch (e) {
    console.error("CRITICAL_ERROR");
    console.error(e);
    console.log("END");
    process.exit(1);
  }
};
