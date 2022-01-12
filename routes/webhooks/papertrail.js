var express = require("express");
var router = express.Router();
const Slack = require("../../helpers/slack");
const Knex = require("../../helpers/knex");

// Home page route.
router.post("/", async function (req, res) {
  const slack = await Slack();
  try {
    const knex = Knex();

    if (!req.body.payload) return res.sendStatus(200);
    console.log(req.body.payload);
    const parsed = JSON.parse(req.body.payload);
    const events = parsed.events;
    const search = parsed.saved_search.query;

    const eventsByJobId = {};

    events
      .filter((item) => {
        const { message, program, received_at } = item;
        if (message.indexOf("API_EVENT") != 0) return false;
        return true;
      })
      .forEach((item) => {
        const { message, program, received_at } = item;
        const messageParts = message.split(":::");
        const data = JSON.parse(messageParts[messageParts.length - 1]);
        const location = messageParts[1];
        const eventType = messageParts[2];
        if (!eventsByJobId[data.job_id])
          eventsByJobId[data.job_id] = {
            job_id: data.job_id,
            script_id: data.script_id,
            schedule_id: data.schedule_id,
            customer_id: data.customer_id,

            events: {
              list: [{ ...data, event_type: eventType, location: location }],
            },
          };
        else {
          eventsByJobId[data.job_id].events.list.push(data);
        }

        if (data.customer_id)
          eventsByJobId[data.job_id].customer_id = data.customer_id;
        if (data.script_id)
          eventsByJobId[data.job_id].script_id = data.script_id;
        if (data.schedule_id)
          eventsByJobId[data.job_id].schedule_id = data.schedule_id;
      });

    const flows = await knex
      .table("flows")
      .select()
      .whereIn("job_id", Object.keys(eventsByJobId));

    let flowsById = {};
    flows.forEach((flow) => (flowsById[flow.job_id] = flow));

    for (let index = 0; index < Object.keys(eventsByJobId).length; index++) {
      const jobId = Object.keys(eventsByJobId)[index];

      if (flowsById[jobId])
        await knex
          .table("flows")
          .update({
            ...eventsByJobId[jobId],
            ...flowsById[jobId],
            events: {
              list: [
                ...flowsById[jobId].events.list,
                ...eventsByJobId[jobId].events.list,
              ],
            },
          })
          .where("job_id", jobId);
      else await knex.table("flows").insert(eventsByJobId[jobId]);
    }

    return res.sendStatus(200);
  } catch (e) {
    await slack.chat.postMessage({
      text: `Error in logs ${e.message} ${e.stack}`,
      channel: slack.generalChannelId,
    });

    return res.sendStatus(200);
  }
});

module.exports = router;

/*
await slack.chat.postMessage({
  text: `${element.location} ${element.eventType} ${JSON.stringify(
    element.data
  )} `,
  channel: slack.generalChannelId,
});

*/
