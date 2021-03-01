var express = require("express");
var router = express.Router();

// Home page route.
router.post("/", function (req, res) {
  return res.sendStatus(200);
  console.log(JSON.parse(req.body.payload));
});

module.exports = router;
