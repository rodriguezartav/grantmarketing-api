let CIO = require("customerio-node");
const cio = new CIO("ff58bfdb81cf900d60f9", "349938720d7a408b0e1f");
const moment = require("moment");

const moment = require("moment");
const { xeroApi, redis } = require("../../helpers/xero");

const getKnex = require("../../helpers/knex_pg");

let knex;
module.exports = async function Run(integrationMap) {
  var trx;

  try {
    knex = await getKnex(integrationMap["postgres"]);

    trx = knex;

    var contacts = await trx
      .table("contacts")
      .select([
        "contacts.*",
        "customers.name as customer_name",
        "customers.id as customer_id",
        "customers_balance.sum as balance",
      ])
      .leftJoin("customers", "customers.id", "contacts.customer_id")
      .leftJoin("customers_balance", "customers.id", "customers_balance.id");

    for (let index = 0; index < contacts.length; index++) {
      const contact = contacts[index];
      let mobile = contact.mobile;

      const res = await cio.identify(contact.id, {
        email: contact.email,
        created_at: moment(contact.created_at).unix(),
        name: contact.name,
        mobile: mobile,
        brands: contact.brands,
        balance: contact.balance || 0,
        role: contact.role,
        segment: contact.segment,
        customer_since: contact.created_at,
        companyName: contact.customer_name,
        companyId: contact.companyId,
        tags: contact.tags,
      });

      await sleep(350);
    }

    //  await trx.commit();
    await knex.destroy();
    process.exit(0);
  } catch (e) {
    //  if (trx) await trx.rollback();
    console.log(e);
    await knex.destroy();
    throw e;
  }
};

if (process.argv[2] && process.argv[3].indexOf("{") == 0)
  (async function () {
    try {
      await Run(JSON.parse(process.argv[2]), parseInt(process.argv[3]));
      process.exit(0);
    } catch (e) {
      console.error(e);
      process.exit(1);
    }
  })();

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
