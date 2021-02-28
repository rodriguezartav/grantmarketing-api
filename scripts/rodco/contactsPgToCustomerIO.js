let CIO = require("../../helpers/customerio");

const moment = require("moment");

const getKnex = require("../../helpers/knex_pg");

let knex;
module.exports = async function Run(integrationMap) {
  try {
    knex = await getKnex(integrationMap["postgres"]);
    const cio = CIO(integrationMap["customerio"]);

    var contacts = await knex
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

    await knex.destroy();
  } catch (e) {
    console.log(e);
    await knex.destroy();
    throw e;
  }
};

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
