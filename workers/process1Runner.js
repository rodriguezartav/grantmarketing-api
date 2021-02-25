const util = require("util");
const execFile = util.promisify(require("child_process").execFile);

try {
  setInterval(async () => {
    let { stdout, stderr, error } = await execFile("node", [
      `./workers/process1.js`,
    ]);
  }, 60000);
} catch (e) {
  console.log("CRITICAL_ERROR");
  console.error(e);
}
