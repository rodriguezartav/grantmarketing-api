const { WebClient } = require("@slack/web-api");

module.exports = function Slack(integration) {
  const token = process.env.SLACK_TOKEN;

  // Initialize
  const web = new WebClient(process.env.SLACK_TOKEN || integration.auth_token);

  const result = await web.conversations.list({
    types: "public_channel"
  });
  console.log(result);
  web.chanels = result.channels;

  return web;
};
