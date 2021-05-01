const request = require("superagent");
const moment = require("moment");

module.exports = class Victron {
  constructor(keys) {
    this.keys = keys;
  }

  login = async function () {
    if (this.token) return;
    const response = await request
      .post("https://vrmapi.victronenergy.com/v2/auth/login")
      .send({
        username: this.keys.client_id,
        password: this.keys.client_secret,
      });
    const { token, idUser } = response.body;
    this.token = token;
    this.idUser = idUser;

    const installResponse = await request
      .get(
        `https://vrmapi.victronenergy.com/v2/users/${this.idUser}/installations?extended=1`
      )
      .set("X-Authorization", "Bearer " + this.token);

    this.installationId = installResponse.body.records[0].idSite;
    this.installationData = installResponse.body.records[0];
    this.dataMap = {};
    this.installationData.extended.forEach((item) => {
      this.dataMap[item.code] = item;
    });
  };

  read = async function () {
    await this.login();
    return this.dataMap;
  };

  stats = async function () {
    await this.login();

    const response = await request
      .get(
        `https://vrmapi.victronenergy.com/v2/installations/${this.installationId}/overallstats`
      )
      .set("X-Authorization", "Bearer " + this.token);

    return response.body;
  };
};
