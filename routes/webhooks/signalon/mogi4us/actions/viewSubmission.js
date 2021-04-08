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

  const integrationMap = await IntegrationMap(Knex(), "jungledynamics");

  const slack = await Slack(integrationMap["mogiForSlack"]);

  const fshare = await request
    .post("https://slack.com/api/files.sharedPublicURL")
    .auth(
      "xoxp-1029697359297-1738488455956-1940535631316-abbcbe3a224467273c547f98feafe3a4",
      {
        type: "bearer",
      }
    )
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

        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*Email Insights* Checkout the latest insights from Mogi. ${private_metadata.message.files[0].permalink_public} `,
          },
        },
      ],
    });

  const sres = await request
    .post("https://slack.com/api/chat.postMessage")
    .auth("xoxb-1029697359297-1958173099952-rpSy4Wh1Y5oJK6MaGlyBXY6P", {
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

  return true;
};
