const moment = require("moment");
const { xeroApi, redis } = require("../../helpers/xero");
const { sfConn, bulk, query } = require("../../helpers/sf");
const getKnex = require("../../helpers/knex_pg");

let knex;
module.exports = async function Run(integrationMap) {
  var trx;

  try {
    const conn = await sfConn(integrationMap["salesforce"]);

    knex = await getKnex(integrationMap["postgres"]);

    trx = knex;

    var contacts = await trx
      .table("contacts")
      .select([
        "contacts.*",
        "customers.name as customer_name",
        "customers.id as customer_id",
        "customers.external_id as customer_external_id",
        "customers_balance.sum as balance",
      ])
      .leftJoin("customers", "customers.id", "contacts.customer_id")
      .leftJoin("customers_balance", "customers.id", "customers_balance.id");

    const clientes = await query(
      conn,
      "select id,external_id__c,saldo__c from account where external_id__c != NULL"
    );
    const clientesMap = {};
    clientes.forEach((item) => {
      clientesMap[item.external_id__c] = item.Id;
    });

    const accounts = contacts
      .filter((contact) => clientesMap[contact.customer_external_id])
      .map((contact) => {
        return {
          Description: contact.brands,
          Industry: contact.segment,
          External_id__c: contact.customer_external_id,
          Id: clientesMap[contact.customer_external_id],
        };
      });

    await bulk(conn, "Account", "update", "external_id__c", accounts);

    //
    await bulk(
      conn,
      "Contact",
      "upsert",
      "external_id__c",
      contacts.map((contact) => {
        return {
          AccountId: clientesMap[contact.customer_external_id],
          Email: contact.email || "",
          Description: contact.tags,
          Department: contact.role,
          firstName: (contact.name || " ").split(" ")[0],
          phone: contact.linea || "",
          LastName: (contact.name || " ").split(" ").slice(1).join(" ") || "-",
          MobilePhone: contact.mobile || "",
          external_id__c: contact.id,
        };
      })
    );

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

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
