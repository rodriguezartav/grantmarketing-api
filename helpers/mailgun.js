const mailgun = require("mailgun-js");

module.exports = function Mailgun(apiKey, domain = "jungledynamics.com") {
  return mailgun({
    apiKey: apiKey || process.env.MAIL_GUN_API_KEY,
    domain: domain,
  });
};

module.exports = Mailgun;
