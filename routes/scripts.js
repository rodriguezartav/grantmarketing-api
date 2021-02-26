var express = require("express");
var router = express.Router();

// Home page route.
router.post("/", function (req, res) {
  const script = require("../scripts/" + req.body.location);
  res.send({ options: script.options || {} });
});

module.exports = router;
