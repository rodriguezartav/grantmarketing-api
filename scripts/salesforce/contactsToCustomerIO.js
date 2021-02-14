if (!process.env.NODE_ENV) require("dotenv").config();

const SfHelper = require("../../helpers/sf");
const customerIO = require("../../helpers/customerio");

const moment = require("moment");

const { sfConn, query } = SfHelper;

async function Run(integrationMap) {
  var trx;

  try {
    const conn = await sfConn(integrationMap["salesforce"]);
    const cio = customerIO(integration);

    const contacts = query(
      conn,
      "select id,name,phone, account__r.name,createdAt,email,Department,Description,account__r.Industry,account__r.Description,account__r.external__id__c ,tags,MobilePhone,FirstName,LastName from Contact "
    );

    for (let index = 0; index < contacts.length; index++) {
      const contact = contacts[index];
      let mobile = contact.mobile;

      const res = await cio.identify(contact.id, {
        email: contact.email,
        created_at: moment(contact.createdAt).unix(),
        name: contact.firstName + " " + contact.lastName,
        mobile: mobile,
        brands: contact.account__r.Description,
        role: contact.Department,
        segment: contact.account__r.Industry,
        customer_since: contact.created_at,
        companyName: contact.account__r.Name,
        companyId: contact.account__r.external_id__c,
        tags: contact.description,
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
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

(async function () {
  try {
    await Run(JSON.parse(process.argv[2]), parseInt(process.argv[3]));
    process.exit(0);
  } catch (e) {
    console.error(e);
    await Knex().destroy();
    process.exit(1);
  }
})();
