const HerokuRunner = require("../workers/helpers/herokuRunner");
async function test() {
  const lines = await HerokuRunner({}, "rodco/test");
  console.log(lines);
}

test();
