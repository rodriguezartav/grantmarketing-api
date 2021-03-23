const moment = require("moment");
const { xeroApi, redis } = require("../../helpers/xero");
const { sfConn, bulk, query } = require("../../helpers/sf");

const request = require("superagent");

module.exports = async function Run(integrationMap) {
  try {
    const Shopify = integrationMap["shopify"];
    const conn = await sfConn(integrationMap["salesforce"]);

    const products = await query(
      conn,
      "select id,codigo__c,precio_mayoreo__c,inventario__c,presentacion__c,external_id__c from producto__c where precio_mayoreo__c != null"
    );

    const productMap = {};
    products.forEach((item) => {
      item.precio_mayoreo__c =
        (item.precio_mayoreo__c * item.presentacion__c) / 0.6;
      item.inventario__c = item.inventario__c / item.presentacion__c;
      item.presentacion__c = item.presentacion__c;

      productMap[item.codigo__c] = item;
    });

    const locationUrl = "admin/api/2020-04/locations.json?limit=250";
    const locationRes = await request
      .get(`https://${Shopify.application_id}/${locationUrl}`)
      .set("X-Shopify-Access-Token", Shopify.client_secret);

    const location = locationRes.body.locations[0];

    const url = "admin/api/2020-04/products.json?presentment_currencies=USD";

    let shopifyProducts = [];
    let lastRes = {
      links: { next: `https://${Shopify.application_id}/${url}` },
    };
    while (lastRes.links.next) {
      const res = await request
        .get(lastRes.links.next)
        .set("X-Shopify-Access-Token", Shopify.client_secret)
        .set("X-Shopify-Api-Features", "include-presentment-prices");
      lastRes = res;
      shopifyProducts = shopifyProducts.concat(res.body.products);
    }

    let updatePromises = [];

    const res = await request
      .get(`https://${Shopify.application_id}/${url}`)
      .set("X-Shopify-Access-Token", Shopify.client_secret)
      .set("X-Shopify-Api-Features", "include-presentment-prices");

    const sfItems = [];

    const update = shopifyProducts.map((item) => {
      let allMapped = true;
      let newVariants = item.variants.map((variant) => {
        let sku = variant.sku;

        if (sku.length == 9) sku = "0" + sku;
        let product = productMap[sku];
        if (product) {
          sfItems.push({
            external_id__c: product.external_id__c,
            short_code__c: item.handle,
          });

          return {
            id: variant.id,
            sku: sku,
            inventory_item_id: variant.inventory_item_id,
            price: parseInt(product.precio_mayoreo__c * 100) / 100,
          };
        } else {
          //console.log(
          // item.title,
          //item.handle,
          //item.variants.map((variant) => variant.sku).join(",")
          //);
          allMapped = false;
          return null;
        }
      });

      return {
        id: item.id,
        variants: allMapped ? newVariants : item.variants,
        published: allMapped,
      };
    });

    await bulk(conn, "producto__c", "upsert", "external_id__c", sfItems);

    for (let index = 0; index < update.length; index++) {
      const element = update[index];

      const url = `admin/api/2020-04/products/${element.id}.json`;

      const productResponse = await request
        .put(`https://${Shopify.application_id}/${url}`)
        .set("X-Shopify-Access-Token", Shopify.client_secret)
        .send({ product: element });

      // console.log(
      //  productResponse.headers["x-shopify-shop-api-call-limit"],
      // productResponse.status
      //);

      const itemUrl = `admin/api/2020-04/inventory_levels/set.json`;

      const promises = element.variants.map((variant) => {
        if (productMap[variant.sku]) {
          try {
            return request
              .post(`https://${Shopify.application_id}/${itemUrl}`)
              .set("X-Shopify-Access-Token", Shopify.client_secret)
              .send({
                location_id: location.id,
                inventory_item_id: variant.inventory_item_id,
                available:
                  productMap[variant.sku] &&
                  productMap[variant.sku].inventario__c > 0
                    ? parseInt(productMap[variant.sku].inventario__c)
                    : 0,
              });
          } catch (e) {
            console.log("CRITICAL", e);
            return Promise.resolve({ headers: {}, status: 0 });
          }
        } else return Promise.resolve({ headers: {}, status: 0 });
      });

      const pr = await Promise.all(promises);
      //pr.map((r) => {
      //if (r && r.headers)
      //  console.log(r.headers["x-shopify-shop-api-call-limit"], r.status);
      //});
      await sleep(2000);
    }
  } catch (e) {
    console.log(e);
    throw e;
  }
};

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
