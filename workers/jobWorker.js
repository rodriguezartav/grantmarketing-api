//Defined in ProcFile

//
// This file calls from Job runner - it run as a fork to keep jobWorker from crasing.
//
const JobRunner = require("./jobRunner");
const Knex = require("../helpers/knex");

(async function () {
  var knex = await Knex();

  try {
    setInterval(async () => {
      try {
        await JobRunner(knex);
      } catch (e) {
        console.log(e);
        console.log("PROCESS_RUNNER ERROR");
      }
    }, 60000);
  } catch (e) {
    console.log("PROCESS_RUNNER CRITICAL_ERROR");
    console.error(e);
  }
})();
