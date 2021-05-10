const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = require("twilio")(accountSid, authToken);

module.exports = function sms(msg, phone,mediaUrl) {

  let msgPayload = {
    body: msg,
    from:
      phone.indexOf("whatsapp") > -1
        ? "whatsapp:" + process.env.TWILIO_NUMBER
        : process.env.TWILIO_NUMBER,
    to: phone,
  };
  if(mediaUrl) msgPayload.mediaUrl=mediaUrl
  return client.messages.create(msgPayload);
};
