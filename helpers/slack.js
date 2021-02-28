const { WebClient } = require("@slack/web-api");

module.exports = async function Slack(integration) {
  const token = process.env.SLACK_TOKEN;

  // Initialize
  const web = new WebClient(process.env.SLACK_TOKEN || integration.auth_token);

  const result = await web.conversations.list({
    types: "public_channel",
  });

  web.channels = result.channels;
  web.channelsMap = {};

  result.channels.forEach((item) => (web.channelsMap[item.name] = item));
  web.generalChannelId = web.channelsMap["general"].id;

  return web;
};
