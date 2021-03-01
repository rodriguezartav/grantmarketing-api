var express = require("express");
var router = express.Router();

// Home page route.
router.post("/", function (req, res) {
  const parsed = JSON.parse(req.body.payload);
  console.log(parsed);

  return res.sendStatus(200);
});

module.exports = router;
