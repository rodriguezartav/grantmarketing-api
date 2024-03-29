const moment = require("moment");
const { xeroApi, redis } = require("../../helpers/xero");
const { sfConn, bulk, query } = require("../../helpers/sf");

module.exports = async function Run(integrationMap) {
  const itemsGetResponse = await xeroApi(integrationMap["xero"], "getContacts");

  const conn = await sfConn(integrationMap["salesforce"]);

  const items = itemsGetResponse.contacts.map((item) => {
    var customerSql = {
      name: item.name,
      number__c: item.taxNumber,
      external_id__c: item.contactID,
      email__c: item.emailAddress,
    };

    console.log(item.paymentTerms);
    if (
      item.paymentTerms &&
      item.paymentTerms.sales &&
      item.paymentTerms.sales.day
    ) {
      customerSql.credito_dias__c = item.paymentTerms.sales.day;
    }

    if (item.addreses && item.address.length > 0) {
      customerSql.shippingAddress = {
        street: item.address[0].addressLine1 || "",
        city: item.address[0].city || "",
      };
    }

    if (item.phones && item.phones.length > 0) {
      customerSql.phone = item.phones[0].phoneNumber;
    }

    return customerSql;
  });

  await bulk(conn, "Account", "upsert", "external_id__c", items);
};
