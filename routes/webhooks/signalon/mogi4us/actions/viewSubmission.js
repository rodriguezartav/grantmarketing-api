const request = require("superagent");
const IntegrationMap = require("../../../../../helpers/integrationMap");
const Knex = require("../../../../../helpers/knex");
const S3 = require("../../../../../helpers/s3");
const Slack = require("../../../../../helpers/slack");
const fs = require("fs");

module.exports = async function (body, res) {
  const { view, trigger_id, message, blocks } = body;
  const { state, callback_id, type } = view;
  res.send({});

  const private_metadata = JSON.parse(view.private_metadata);
  console.log(state);

  const integrationMap = await IntegrationMap(
    Knex(),
    state.values.customer_select_section.customer_select.selected_option.value
  );

  const slack = await Slack(integrationMap["mogiForSlack"]);

  if (
    private_metadata.message.files &&
    private_metadata.message.files.length > 0
  )
    await request
      .post("https://slack.com/api/files.sharedPublicURL")
      .auth(process.env.MOGI_SLACK_USER_TOKEN, {
        type: "bearer",
      })
      .send({
        file: private_metadata.message.files[0].id,
      });

  const sres1 = await request
    .post("https://slack.com/api/chat.postMessage")
    .auth(integrationMap.mogiForSlack.auth_token, {
      type: "bearer",
    })
    .send({
      channel: slack.channels.filter((item) => item.name == "general")[0].id,
      text: private_metadata.message.text,
      blocks: [
        {
          type: "section",
          text: {
            type: "plain_text",
            emoji: true,
            text: private_metadata.message.text,
          },
        },

        private_metadata.message.files &&
        private_metadata.message.files.length > 0
          ? {
              type: "section",
              text: {
                type: "mrkdwn",
                text: `*Email Insights* Checkout the latest insights from Mogi. ${private_metadata.message.files[0].permalink_public} `,
              },
            }
          : {},
      ],
    });

  const sres = await request
    .post("https://slack.com/api/chat.postMessage")
    .auth(process.env.MOGI_SLACK_BOT_TOKEN, {
      type: "bearer",
    })
    .send({
      channel: private_metadata.channel.id,
      text:
        "Message sent to " +
        state.values.customer_select_section.customer_select.selected_option
          .value,
      blocks: [
        {
          type: "section",
          text: {
            type: "plain_text",
            emoji: true,
            text:
              "* Message sent to " +
              state.values.customer_select_section.customer_select
                .selected_option.value +
              " *",
          },
        },
        {
          type: "section",
          text: {
            type: "plain_text",
            emoji: true,
            text: private_metadata.message.text,
          },
        },
      ],
    });

  console.log("NOTICE", sres.body, sres.text);

  return true;
};
