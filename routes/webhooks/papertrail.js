var express = require("express");
var router = express.Router();

// Home page route.
router.post("/", function (req, res) {
  console.log(req.body);
  return res.sendStatus(200);
});

module.exports = router;
