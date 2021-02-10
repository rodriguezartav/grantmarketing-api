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

  const itemsGetResponse = await xeroApi(customer_id, "getItems");

  const taxRatesResponse = await xeroApi(customer_id, "getTaxRates");
  const rates = {};
  taxRatesResponse.taxRates.forEach((item) => {
    rates[item.taxType] = parseFloat(item.taxComponents[0].rate);
  });

  console.log(rates);
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

(async function () {
  try {
    await Run(parseInt(process.argv[2].replace("customer_id=", "")));
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
