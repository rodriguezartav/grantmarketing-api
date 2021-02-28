const moment = require("moment");
const { xeroApi, redis } = require("../../helpers/xero");

const getKnex = require("../../helpers/knex_pg");

module.exports = async function Run(integrationMap) {
  var trx;
  let knex;

  try {
    const itemsGetResponse = await xeroApi(integrationMap["xero"], "getItems");

    knex = await getKnex(integrationMap["postgres"]);
    trx = await knex.transaction();

    var products = await trx.table("products").select();
    var productMap = {};
    products.forEach((item) => {
      productMap[item.code] = item;
    });

    const items = itemsGetResponse.items;
    for (let index = 0; index < items.length; index++) {
      const item = items[index];
      const product = productMap[item.code];

      var productSql = {
        id: product ? product.id : null,
        active: item.name.indexOf("__") != 0,
        code: item.code,
        full_name: product && product.full_name ? product.full_name : item.name,
        name: item.name,
        inventory: item.quantityOnHand,
        cost: item.purchaseDetails.unitPrice,
        price: item.salesDetails.unitPrice,
        external_id: item.itemID,
        unit:
          item.salesDetails.taxType ==
          (process.env.TAX_RATE_SERVICIOS || "TAX005")
            ? "Os"
            : "Unid",
        updated_at: moment().toISOString(),
      };

      try {
        if (!productSql.id) {
          delete productSql.id;
          await trx("products").insert(productSql);
        } else await trx("products").update(productSql).where("id", product.id);
      } catch (e) {
        console.log("error", item.code, product ? product.code : e);
      }
    }

    await trx.commit();
    await knex.destroy();
  } catch (e) {
    if (trx) await trx.rollback();
    await knex.destroy();

    console.log(e);
    throw e;
  }
};
