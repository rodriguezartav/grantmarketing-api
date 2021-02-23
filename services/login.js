const { getModel } = require("../models");
const sgMail = require("@sendgrid/mail");
const { IS_DEV_TEST } = require("../helpers/booleans");
const moment = require("moment");

module.exports = class LoginService {
  constructor() {
    this.getOne = getModel("getOne");
    this.getList = getModel("getList");
    this.update = getModel("update");
    this.Worker = getModel("worker");
  }

  async getCode({ phone }) {
    var user = await this.getOne("admins", { phone: phone });
    if (user) {
      let code = parseInt(Math.random() * 100000);
      await this.update("admins", { code: code }, { phone: phone });

      //Sends email if it's not testing/developing

      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      const client = require("twilio")(accountSid, authToken);

      await client.messages
        .create({
          body: `Hi ${user.name},\n Your login code is: ${code}`,
          from: process.env.TWILIO_NUMBER,
          to: phone,
        })
        .then((message) => console.log(message.sid));
    }
    return user;
  }

  async sendCode({ phone }) {
    var user = await this.getOne("admins", { phone: phone });
    if (user) {
      let code = parseInt(Math.random() * 100000);
      await this.update("admins", { code: code }, { phone: phone });

      //Sends email if it's not testing/developing

      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      const client = require("twilio")(accountSid, authToken);

      await client.messages
        .create({
          body: `Hi ${user.name},\n This is your JD login code: ${code}.`,
          from: process.env.TWILIO_NUMBER,
          to: user.country_code + phone,
        })
        .then((message) => console.log(message.sid));
    }
    return user;
  }

  async authenticate({ code, phone, endpoint, applicationSid }) {
    var user = await this.getOne("admins", { phone });
    if (process.env.NODE_ENV != "development" && user.code != code) return null;

    if (user) {
      user.timestamp = moment().valueOf();
      try {
        await this.update("admins", { code: null }, { code: code });
      } catch (e) {}
      return { user };
    }
    return null;
  }
};
