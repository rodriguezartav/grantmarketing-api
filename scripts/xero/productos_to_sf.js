require("dotenv").config();

const SfHelper = require("../../helpers/sf");

const { xeroApi, redis } = require("../../helpers/xero");

const { sfConn, bulk } = SfHelper;

const moment = require("moment");
const util = require("util");
let knex;

module.exports = async function Run(integrationMap) {
  var trx;

  const itemsGetResponse = await xeroApi(integrationMap["xero"], "getItems");

  const taxRatesResponse = await xeroApi(integrationMap["xero"], "getTaxRates");
  const rates = {};
  taxRatesResponse.taxRates.forEach((item) => {
    rates[item.taxType] = parseFloat(item.taxComponents[0].rate);
  });

  const conn = await sfConn(integrationMap["salesforce"]);

  // knex = await getKnex();
  //trx = await knex.transaction();
  //
  const items = itemsGetResponse.items.map((item) => {
    var productSql = {
      codigo__c: item.code,
      name: item.name,
      inventario__c: item.quantityOnHand,
      tax_code__c: rates[item.salesDetails.taxType] || 13,
      costo__c: item.purchaseDetails.unitPrice,
      marca__c: getMarca(item.description),
      grupo__c: getGrupo(item.description),
      external_id__c: item.itemID,
      descripcion__c: item.description,
    };

    return productSql;
  });

  //await bulk(conn, "producto__c", "upsert", "external_id__c", items);
};

function getMarca(name) {
  if (name.toLowerCase().indexOf("hilco") > -1) return "hilco";
  if (name.toLowerCase().indexOf("yale") > -1) return "yale";
  if (name.toLowerCase().indexOf("delko") > -1) return "delko";
  if (name.toLowerCase().indexOf("condusal") > -1) return "condusal";
  return "otro";
}

function getGrupo(name) {
  return name.split(":")[1] || "Otro";
}

if (process.argv[3] && process.argv[3].indexOf("{") == 0)
  (async function () {
    try {
      await Run(JSON.parse(process.argv[2]), parseInt(process.argv[3]));
      process.exit(0);
    } catch (e) {
      console.error(e);
      process.exit(1);
    }
  })();
