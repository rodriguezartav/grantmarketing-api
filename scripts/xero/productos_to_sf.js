require("dotenv").config();
const Knex = require("../../helpers/knex");

const SfHelper = require("../../helpers/sf");
const { xeroApi, redis } = require("../../helpers/xero");

const { sfConn, bulk } = SfHelper;

const moment = require("moment");
const util = require("util");
let knex;

async function Run(customer_id) {
  var trx;

  try {
    const itemsGetResponse = await xeroApi(customer_id, "getItems");

    const taxRatesResponse = await xeroApi(customer_id, "getTaxRates");
    const rates = {};
    taxRatesResponse.taxRates.forEach((item) => {
      rates[item.taxType] = parseFloat(item.taxComponents[0].rate);
    });

    console.log(rates);
  } catch (e) {
    console.log(e);
    throw e;
  } finally {
    Knex().destroy();
    process.exit(0);
  }
}

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

try {
  Run(parseInt(process.argv[2].replace("customer_id=", "")));
} catch (e) {
  console.log(e);
}
