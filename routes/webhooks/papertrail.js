var express = require("express");
var router = express.Router();
const Slack = require("../../helpers/slack");

// Home page route.
router.post("/", async function (req, res) {
  const parsed = JSON.parse(req.body.payload);
  const events = parsed.events;
  const search = parsed.saved_search.query;
  const slack = await Slack();

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
      const location = messageParts[1];
      const eventType = messageParts[2];
      return { location, eventType, data };
    });

  for (let index = 0; index < parsedEvents.length; index++) {
    const element = parsedEvents[index];
    await slack.chat.postMessage({
      text: `${element.location} ${element.eventType} ${JSON.stringify(
        element.data
      )} `,
      channel: slack.generalChannelId,
    });
  }

  return res.sendStatus(200);
});

module.exports = router;
