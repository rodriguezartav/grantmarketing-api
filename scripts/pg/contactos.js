if (!process.env.NODE_ENV) require("dotenv").config();
var jsforce = require("jsforce");
var conn = new jsforce.Connection();
const SfHelper = require("../helpers/sf");

const { sfConn, bulk, query } = SfHelper;

const moment = require("moment");

const Knex = require("knex");
const getKnex = require("../../helpers/knex");
let knex;
(async () => {
  var trx;

  try {
    const conn = await sfConn();

    knex = await getKnex();

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
      "select id,external_id__c,saldo__c from account"
    );
    const clientesMap = {};
    clientes.forEach((item) => {
      clientesMap[item.external_id__c] = item.Id;
    });

    await bulk(
      conn,
      "Account",
      "update",
      contacts
        .filter((contact) => clientesMap[contact.customer_external_id])
        .map((contact) => {
          return {
            Descriptions: contact.brands,
            Industry: contact.segment,

            Id: clientesMap[contact.customer_external_id],
          };
        })
    );

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
})().catch((e) => {
  throw e;
});

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
