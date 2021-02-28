//Defined in ProcFile

//
// This file calls from Job runner - it run as a fork to keep jobWorker from crasing.
//

const util = require("util");
const execFile = util.promisify(require("child_process").execFile);

try {
  setInterval(async () => {
    let { stdout, stderr, error } = await execFile("node", [
      `./workers/jobRunner.js`,
    ]);
  }, 60000);
} catch (e) {
  console.log("PROCESS_RUNNER CRITICAL_ERROR", process.exit(0));
  console.error(e);
}
