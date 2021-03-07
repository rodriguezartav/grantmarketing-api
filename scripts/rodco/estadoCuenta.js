if (!process.env.NODE_ENV) require("dotenv").config();

const sgMail = require("@sendgrid/mail");
sgMail.setApiKey(process.env.SG_MAIL_API_KEY);
const numeral = require("numeral");
const moment = require("moment");
const { xeroApi, redis } = require("../../helpers/xero");
const util = require("util");
const getKnex = require("../../helpers/knex");
let knex;
(async () => {
  var trx;

  try {
    let xeroNcs = { creditNotes: [] };
    let index = 1;
    while (index < 2) {
      let response = await xeroApi(
        "getCreditNotes",
        null,
        "RemainingCredit!=0",
        "date",
        [],
        [],
        [],
        ["AUTHORISED", "PAID"],
        index
      );
      if (response.creditNotes.length == 0) {
        index = 26;
      }
      xeroNcs.creditNotes = xeroNcs.creditNotes.concat(response.creditNotes);
      index++;
    }

    let xeroInvoices = { invoices: [] };
    index = 1;
    while (index < 30) {
      let response = await xeroApi(
        "getInvoices",
        null,
        "AmountDue!=0",
        "date",
        [],
        [],
        [],
        ["AUTHORISED", "PAID"],
        index
      );
      if (response.invoices.length == 0) {
        index = 31;
      }
      xeroInvoices.invoices = xeroInvoices.invoices.concat(response.invoices);
      index++;
    }

    xeroNcs = xeroNcs.creditNotes;
    xeroInvoices = xeroInvoices.invoices;

    knex = await getKnex(integrationMap["postgres"]);
    trx = knex;

    let customers = await trx
      .table("contacts")
      .select(["customers.external_id", "contacts.*"])
      .join("customers", "contacts.customer_id", "customers.id")
      .where("contacts.tags", "ilike", "%pago%");

    const documentsByContactId = {};

    xeroInvoices = xeroInvoices
      .filter((item) => {
        return item.type == "ACCREC" && item.status == "AUTHORISED";
      })
      .forEach((item) => {
        const contactID = item.contact.contactID;
        if (!documentsByContactId[contactID])
          documentsByContactId[contactID] = [];
        documentsByContactId[contactID].push({
          date: item.date,
          number: item.invoiceNumber,
          balance: item.amountDue,
          current_term: moment().diff(moment(item.date), "days") + " días",
        });
      });

    xeroNcs = xeroNcs
      .filter((item) => {
        return item.type == "ACCRECCREDIT" && item.status == "AUTHORISED";
      })
      .forEach((item) => {
        const contactID = item.contact.contactID;

        if (!documentsByContactId[contactID])
          documentsByContactId[contactID] = [];

        documentsByContactId[contactID].push({
          date: item.date,
          number: item.creditNoteNumber,
          balance: item.remainingCredit,
          current_term: "-",
        });
      });

    var arrays = [],
      size = 20;

    while (customers.length > 0) arrays.push(customers.splice(0, size));

    for (let index = 0; index < arrays.length; index++) {
      const array = arrays[index];

      const personalizations = array
        .map((item, index) => {
          const invoices = documentsByContactId[item.external_id];
          if (!invoices || invoices.length == 0) return null;
          let total = 0;
          invoices.forEach((item) => {
            total += item.balance;
            item.balance = numeral(item.balance).format("0,0.00");
          });
          return {
            to: item.email,
            cc: [`facturas+${index}@rodcocr.com`],
            dynamicTemplateData: {
              fecha: moment(item.date).format("DD - MMM - YYYY"),
              invoices: invoices,
              total: numeral(total).format("0,00.00"),
              customer_name: item.name,
            },
          };
        })
        .filter((item) => item != null);

      const msg = {
        from: "credito@rodcocr.com",
        subject: "Estado de Cuenta Rodco",
        templateId: "d-b7afed3ca4b548e5932d7401a607a7c4",
        dynamic_template_data: {
          subject: "Estado de Cuenta Rodco",
        },
        personalizations,
      };

      try {
        const response = await sgMail.send(msg);
        console.log(JSON.stringify(response));
      } catch (e) {
        console.log(JSON.stringify(e));
      }
    }
  } catch (e) {
    knex && (await knex.destroy());
    redis && redis.end(true);
    console.log(e);
    process.exit(1);
  }

  redis.end(true);

  process.exit(0);
})();
