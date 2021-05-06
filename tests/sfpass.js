const request = require("superagent");
const jsforce = require("jsforce");

var conn = new jsforce.Connection();

conn.login(
  "grant_grigorian@dellteam.com.boomi",
  "n7T8jzf!cJ4j5hYKTqLiT0Fyepw1c7vjBVXVO5VK",
  function (err, userInfo) {
    console.log(arguments);
  }
);
