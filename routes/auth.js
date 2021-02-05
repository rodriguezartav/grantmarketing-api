var express = require("express");
var router = express.Router();

/* GET users listing. */
router.get("/", function (req, res, next) {
  return res.json({
    "X-Hasura-User-Id": "25",
    "X-Hasura-Role": "user",
    "X-Hasura-Is-Owner": "true",
    "X-Hasura-Custom": "custom value",
  });
});

router.post("/", function (req, res, next) {
  return res.json({
    "X-Hasura-User-Id": "25",
    "X-Hasura-Role": "user",
    "X-Hasura-Is-Owner": "true",
    "X-Hasura-Custom": "custom value",
  });
});

module.exports = router;
