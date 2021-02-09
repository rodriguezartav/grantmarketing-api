const { XeroClient } = require("xero-node");
const { promisify } = require("util");
const Knex = require("../helpers/knex");
const { IS_DEV_TEST } = require("./booleans");

async function loadXero() {
  //TODO REMOVE
}

async function getToken(customer_id) {
  return await Knex()
    .table("integrations")
    .where("provider_name", "xero")
    .where("customer_id", customer_id)
    .first();
}

async function xeroApi(customer_id, method, ...rest) {
  let xero = new XeroClient({});
  try {
    const integration = await getToken(customer_id);

    await xero.setTokenSet({ access_token: integration.auth_token });
    var response = await xero.accountingApi[method].apply(xero.accountingApi, [
      integration.application_id,
      ...rest,
    ]);

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
  getToken,
  xeroApi,
  parseSingleError,
};
