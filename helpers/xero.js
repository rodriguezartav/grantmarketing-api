const { XeroClient } = require("xero-node");
const { promisify } = require("util");
const Knex = require("../helpers/knex");
const { IS_DEV_TEST } = require("./booleans");

async function loadXero() {
  //TODO REMOVE
}

async function xeroApi(integration, method, ...rest) {
  console.log("creating xero connection");
  let xero = new XeroClient({});
  try {
    await xero.setTokenSet({ access_token: integration.auth_token });
    var response = await xero.accountingApi[method].apply(xero.accountingApi, [
      integration.application_id,
      ...rest,
    ]);

    if (response.status >= 500) {
      console.log(response);

      await sleep(60000);
      response = await xeroApi(integration, method, ...rest);
    }

    return response.body;
  } catch (e) {
    return Promise.reject({
      status: 409,
      message: parseSingleError(e),
    });
  }
}

function parseSingleError(e) {
  console.log(JSON.stringify(e));
  var response = e.response || {
    body: { Message: e.message || JSON.stringify(e) },
  };

  var validationErrors = [];
  if (response.body && response.body.Elements) {
    response.body.Elements.forEach((element) => {
      if (element.ValidationErrors) {
        element.ValidationErrors.forEach((verror) => {
          validationErrors.push(verror.Message);
        });
      }
    });
  } else
    validationErrors = [
      response.body && response.body.Message ? response.body.Message : "",
    ];

  return validationErrors.join("\n");
}

/*

ErrorNumber:16
Message:"Operator '==' incompatible with operand types 'String' and 'UInt32'"
Type:"QueryParseException"
*/

module.exports = {
  loadXero,
  xeroApi,
  parseSingleError,
};

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
