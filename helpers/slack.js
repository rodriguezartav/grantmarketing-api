const { WebClient } = require("@slack/web-api");

const channelsByToken = {};

module.exports = async function Slack(integration = {}) {
  console.log("creating slack connection");

  // Initialize
  const web = new WebClient(integration.auth_token || process.env.SLACK_TOKEN);
  web.channelsMap = {};

  if (channelsByToken[integration.auth_token || process.env.SLACK_TOKEN])
    web.channels =
      channelsByToken[integration.auth_token || process.env.SLACK_TOKEN];
  else {
    console.log("Loading Slack Channels");
    const result = await web.conversations.list({
      types: "public_channel",
      exclude_archived: true,
    });

    web.channels = result.channels;
    channelsByToken[integration.auth_token || process.env.SLACK_TOKEN] =
      result.channels;
  }
  web.channels.forEach((item) => (web.channelsMap[item.name] = item));
  web.generalChannelId = web.channelsMap["general"].id;

  return web;
};
