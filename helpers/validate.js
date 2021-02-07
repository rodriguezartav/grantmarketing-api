var Ajv = require("ajv");
const moment = require("moment");

module.exports = async function (schemaName, body, useDefaults = false) {
  var fields = Object.keys(body);
  var item = {};
  fields.forEach((key) => {
    if (body[key] != null) item[key] = body[key];
  });

  var ajv = new Ajv({ allErrors: true, useDefaults: useDefaults });

  var schema = require("../schemas/" + schemaName);

  if (schema.properties.updated_at) {
    item.updated_at = moment().toISOString();
  }
  delete item.created_at;

  var validate = ajv.compile(schema);
  var valid = validate(item);
  if (!valid) {
    console.log(
      ajv.errorsText(validate.errors, {
        separator: "\n",
      })
    );
    return Promise.reject({
      status: 400,
      message: ajv.errorsText(validate.errors, {
        separator: "\n",
      }),
      errors: validate.errors,
    });
  }
  return Promise.resolve(item);
};
