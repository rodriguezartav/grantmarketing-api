const request = require("superagent");

module.exports = async function (body, res) {
  const { callback_id, type, channel, trigger_id, message, blocks } = body;

  const payload = {
    trigger_id: trigger_id,
    view: {
      private_metadata: JSON.stringify({
        message: {
          text: message.text,
          files: message.files.map((item) => {
            return { id: item.id, permalink_public: item.permalink_public };
          }),
        },
        channel,
      }),
      type: "modal",
      callback_id: "send_to_customer_modal",
      title: {
        type: "plain_text",
        text: "Send to customer",
      },
      submit: {
        type: "plain_text",
        text: "Submit",
      },
      blocks: [
        {
          block_id: "customer_select_section",
          type: "section",
          text: {
            type: "mrkdwn",
            text: "Pick an item from the dropdown list",
          },
          accessory: {
            action_id: "customer_select",
            type: "static_select",
            placeholder: {
              type: "plain_text",
              text: "Select a customer",
            },
            options: [
              {
                text: {
                  type: "plain_text",
                  text: "SignalOn",
                },
                value: "signalon",
              },
              {
                text: {
                  type: "plain_text",
                  text: "Heap",
                },
                value: "heap",
              },
              {
                text: {
                  type: "plain_text",
                  text: "Boomi",
                },
                value: "boomi",
              },
              {
                text: {
                  type: "plain_text",
                  text: "JungleDynamics",
                },
                value: "JungleDynamics",
              },
            ],
          },
        },
      ],
    },
  };

  const sres = await request
    .post("https://slack.com/api/views.open")
    .auth("xoxb-1029697359297-1958173099952-rpSy4Wh1Y5oJK6MaGlyBXY6P", {
      type: "bearer",
    })
    .send(payload);
  res.send({});
  return true;
};
