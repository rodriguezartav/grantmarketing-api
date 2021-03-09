const moment = require("moment");
const request = require("superagent");

let knex;
module.exports = async function Run(integrationMap) {
  try {
    const integrationMarketo = integrationMap["marketo"];

    const url =
      `${integrationMarketo.application_id}/v1/leads/describe.json?access_token=` +
      integrationMarketo.auth_token;

    let response = await request.get(url);

    console.log(response.body);
  } catch (e) {
    console.log(e);

    throw e;
  }
};
