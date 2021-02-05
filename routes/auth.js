var express = require("express");
var router = express.Router();

/* GET users listing. */
router.get("/", async function (req, res, next) {
  const items = await req.knex.table("customers").select();
  res.json({ data: items });
});

module.exports = router;
