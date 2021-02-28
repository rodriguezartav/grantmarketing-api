const moment = require("moment");
const { xeroApi, redis } = require("../../helpers/xero");
const { sfConn, bulk, query } = require("../../helpers/sf");
const getKnex = require("../../helpers/knex_pg");

module.exports = async function Run(integrationMap) {
  const conn = await sfConn(integrationMap["salesforce"]);

  const itemsGetResponse = await xeroApi(integrationMap["xero"], "getItems");

  const productos = await query(
    conn,
    "select id,codigo__c,precio__c from producto__c "
  );
  const productosMap = {};
  productos.forEach((item) => {
    productosMap[item.codigo__c] = item.Id;
  });

  const items = itemsGetResponse.items;
  const toUpdate = [];
  for (let index = 0; index < items.length; index++) {
    const item = items[index];
    if (item.name == "xxxxxx") return;

    const product = productosMap[item.code];
    if (![item.code]) console.log("not found", item.name, item.code);
    else if (!product) {
      console.log("producto not found ", item.code);
    } else {
      const newItem = {
        salesDetails: {
          ...item.salesDetails,
          unitPrice: product.precio_mayoreo__c,
        },
        itemID: item.itemID,
        code: item.code,
      };

      toUpdate.push(newItem);
    }
  }

  var arrays = [],
    errors = [],
    size = 500;

  while (toUpdate.length > 0) arrays.push(toUpdate.splice(0, size));

  for (let index = 0; index < arrays.length; index++) {
    const element = arrays[index];
    const response = await xeroApi(
      "updateOrCreateItems",
      {
        items: element,
      },
      false
    );
    errors = errors.concat(
      response.items
        .filter((item) => item.HasValidationErrors)
        .map((item) => {
          return item;
        })
    );
  }
};
