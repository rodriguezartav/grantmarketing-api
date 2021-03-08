const { WebClient } = require("@slack/web-api");

const channelsByToken = {};

module.exports = async function Slack(integration) {
  console.log("creating slack connection");

  // Initialize
  const web = new WebClient(process.env.SLACK_TOKEN || integration.auth_token);
  web.channelsMap = {};

  if (channelsByToken[process.env.SLACK_TOKEN || integration.auth_token])
    web.channels =
      channelsByToken[process.env.SLACK_TOKEN || integration.auth_token];
  else {
    console.log("Loading Slack Channels");
    const result = await web.conversations.list({
      types: "public_channel",
    });

    web.channels = result.channels;
    channelsByToken[process.env.SLACK_TOKEN || integration.auth_token] =
      result.channels;
  }
  web.channels.forEach((item) => (web.channelsMap[item.name] = item));
  web.generalChannelId = web.channelsMap["general"].id;

  return web;
};
