var express = require("express");
var router = express.Router();

// Home page route.
router.post("/", function (req, res) {
  const parsed = JSON.parse(req.body.payload);
  const events = parsed.events;
  const search = parsed.saved_search.query;

  const parsedEvents = events
    .filter((item) => {
      const { message, program, received_at } = item;
      if (message.indexOf("API_EVENT") != 0) return false;
      return true;
    })
    .map((item) => {
      const { message, program, received_at } = item;
      const messageParts = message.split(":::");
      const data = JSON.parse(messageParts[messageParts.length - 1]);
      const location = messageParts[0];
      const eventType = messageParts[1];
    });

  console.log(parsedEvents);

  return res.sendStatus(200);
});

module.exports = router;
