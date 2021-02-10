const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = require("twilio")(accountSid, authToken);

module.exports = function sms(msg, phone) {
  return client.messages.create({
    body: msg,
    from: process.env.TWILIO_NUMBER,
    to: phone,
  });
};
