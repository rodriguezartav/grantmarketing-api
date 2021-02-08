const { XeroClient } = require("xero-node");
const { promisify } = require("util");
const Knex = require("../helpers/knex");
const { IS_DEV_TEST } = require("./booleans");
 

async function loadXero() {
  //TODO REMOVE
  
}

async function getToken(customer_id) {
  const redisTokens = await Knex().table("integrations").where("provider_name","xero").where("customer_id",customer_id)
  var tokens = JSON.parse(redisTokens);
  return tokens;
}

async function xeroApi(method, ...rest) {
  if (IS_DEV_TEST) return Promise.resolve({});

  let xero = new XeroClient({});
  try {
    const redisTokens = await getAsync("xero_token");
    var tokens = JSON.parse(redisTokens);
    const tokenSet = tokens.token;
    await xero.setTokenSet(tokenSet);
    var response = await xero.accountingApi[method].apply(xero.accountingApi, [
      tokens.tenant.tenantId,
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
  redis: client,
  loadXero,
  getToken,
  xeroApi,
  parseSingleError,
};
