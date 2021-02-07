var express = require("express");
var router = express.Router();

// Home page route.
router.get("/:name", function (req, res) {
  res.send(require("../schemas/" + req.params.name + ".json"));
});

module.exports = router;
