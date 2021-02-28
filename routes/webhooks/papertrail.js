var express = require("express");
var router = express.Router();

// Home page route.
router.post("/", function (req, res) {
  console.log(req.body.events);
  return res.sendStatus(200);
});

module.exports = router;
