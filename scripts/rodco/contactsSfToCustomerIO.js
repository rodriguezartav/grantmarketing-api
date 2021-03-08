let CIO = require("../../helpers/customerio");

const moment = require("moment");
const { sfConn, bulk, query } = require("../../helpers/sf");

let knex;
module.exports = async function Run(integrationMap) {
  try {
    const conn = await sfConn(integrationMap["salesforce"]);

    const cio = CIO(integrationMap["customerio"]);

    var contacts = await query(
      conn,
      "select id,name,email,mobilePhone,phone, department, account__r.name, account__r.Id,account__r.saldo__c,createdAt,department,description,title from contact "
    );

    for (let index = 0; index < contacts.length; index++) {
      const contact = contacts[index];

      const res = await cio.identify(contact.id, {
        email: contact.email,
        created_at: moment(contact.createdAt).unix(),
        name: contact.name,
        mobile: mobilePhone,
        brands: contact.description,
        balance: contact.account__r ? contact.account__r.saldo__c : 0,
        role: contact.title,
        segment: contact.department,
        customer_since: contact.createdAt,
        companyName: contact.account__r ? contact.account__r.name : null,
        companyId: contact.account__r ? contact.account__r.id : null,
      });

      await sleep(350);
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
