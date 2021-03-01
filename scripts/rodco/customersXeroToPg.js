const moment = require("moment");
const { xeroApi, redis } = require("../../helpers/xero");

const getKnex = require("../../helpers/knex_pg");

let knex;
module.exports = async function Run(integrationMap) {
  try {
    console.log(
      `API_EVENT:::SCRIPT:::EVENT:::${JSON.stringify({
        message: "Getting Cusotmers",
        time: moment().unix(),
      })}`
    );

    const itemsGetResponse = await xeroApi(
      integrationMap["xero"],
      "getContacts"
    );

    knex = await getKnex(integrationMap["postgres"]);

    var customers = await knex.table("customers").select();

    var customerMap = {};
    var customerMapName = {};
    var customerMapExternalId = {};
    var customerMapId = {};
    var ids = [];
    customers.forEach((item) => {
      customerMapId[item.id] = item;
      ids.push(item.id);
      //If Exists - duplicate
      if (customerMap[item.identification]) {
        const existingItem = customerMap[item.identification];
        // keep the new one
        if (item.credit_term > existingItem.credit_term) {
          item = { ...existingItem, ...item };
          customerMap[item.identification] = item;
          customerMapName[item.name] = item;
          if (item.external_id) customerMapExternalId[item.external_id] = item;
          else delete customerMapExternalId[item.external_id];
        } else {
          //keep the original
          //item will be deactivated
          customerMap[item.identification] = { ...item, ...existingItem };
          customerMapName[item.name] = { ...item, ...existingItem };
          if (item.external_id)
            customerMapExternalId[item.external_id] = {
              ...item,
              ...existingItem,
            };
          item;
        }
      }
      // if its not duplicated - yet
      else {
        customerMap[item.identification] = item;
        customerMapName[item.name] = item;
        if (item.external_id) customerMapExternalId[item.external_id] = item;
      }
    });

    const items = itemsGetResponse.contacts;
    for (let index = 0; index < items.length; index++) {
      const item = items[index];
      const customer =
        customerMap[item.taxNumber] ||
        customerMapName[item.name] ||
        customerMapExternalId[item.contactID];

      if (customer) {
        ids = ids.filter((idLoop) => idLoop != customer.id);
      }

      var customerSql = {
        id: customer ? customer.id : null,
        active: item.contactStatus == "ARCHIVED" ? false : true,
        name: item.name,
        identification: item.taxNumber,
        updated_at: moment().toISOString(),
        external_id: item.contactID,
        email_for_invoice: item.emailAddress,

        updated_at: moment().toISOString(),
      };

      if (
        item.paymentTerms &&
        item.paymentTerms.sales &&
        item.paymentTerm.sales.day
      )
        customerSql.credit_term = item.paymentTerms.sales.day;

      console.log(
        `API_EVENT:::SCRIPT:::EVENT:::${JSON.stringify({
          message: "Saving",
          time: moment().unix(),
        })}`
      );

      try {
        if (!customerSql.id) {
          delete customerSql.id;
          await knex.table("customers").insert(customerSql);
        } else
          await knex
            .table("customers")
            .update(customerSql)
            .where("id", customer.id);
      } catch (e) {
        console.log(item.taxNumber, customer ? product.identification : e);
      }
    }

    console.log(
      `API_EVENT:::SCRIPT:::EVENT:::${JSON.stringify({
        message: "done Saving",
        time: moment().unix(),
      })}`
    );

    for (let index = 0; index < ids.length; index++) {
      const id = ids[index];
      await knex
        .table("customers")
        .update({
          active: false,
          external_id: "",
          identification: customerMapId[id].identification,
        })
        .where("id", id);
    }

    console.log(
      `API_EVENT:::SCRIPT:::EVENT:::${JSON.stringify({
        message: "COMPLETE",
        time: moment().unix(),
      })}`
    );

    await knex.destroy();
    return true;
  } catch (e) {
    console.log(e);
    if (knex) await knex.destroy();
    throw e;
  }
};
