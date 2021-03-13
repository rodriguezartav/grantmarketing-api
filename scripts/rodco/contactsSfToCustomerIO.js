let CIO = require("../../helpers/customerio");
const request = require("superagent");

const moment = require("moment");
const { sfConn, bulk, query } = require("../../helpers/sf");

let knex;
module.exports = async function Run(integrationMap) {
  try {
    const conn = await sfConn(integrationMap["salesforce"]);

    const cioAuth = new Buffer.from(
      `${integrationMap["customerio"].client_id}:${integrationMap["customerio"].client_secret}`
    ).toString("base64");

    const cio = CIO(integrationMap["customerio"]);

    var contacts = await query(
      conn,
      "select id,name,email,mobilePhone,phone, account.name, account.Id,account.saldo__c,CreatedDate,department,description,title from contact "
    );

    for (let index = 0; index < contacts.length; index++) {
      const contact = contacts[index];

      const res = await request
        .put(`https://track.customer.io/api/v1/customers/${contact.id}`)
        .set("Authorization", `Basic ${cioAuth}`)
        .send({
          email: contact.email,
          created_at: moment(contact.createddate).unix(),
          name: contact.name,
          mobile: contact.mobilephone,
          brands: contact.description,
          balance: contact.account__r ? contact.account__r.saldo__c : 0,
          role: contact.title,
          segment: contact.department,
          customer_since: contact.createddate,
          companyName: contact.account__r ? contact.account__r.name : null,
          companyId: contact.account__r ? contact.account__r.id : null,
        });

      await sleep(10);
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
