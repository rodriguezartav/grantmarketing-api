const moment = require("moment");
const { xeroApi, redis } = require("../../helpers/xero");
const { sfConn, bulk, query } = require("../../helpers/sf");
const getKnex = require("../../helpers/knex_pg");

let knex;
module.exports = async function Run(integrationMap) {
  var trx;

  try {
    let xeroNcs = { creditNotes: [] };
    let index = 1;
    while (index < 4) {
      let response = await xeroApi(
        integrationMap["xero"],
        "getCreditNotes",
        moment().add(-4, "d"),
        "",
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
    while (index < 4) {
      let response = await xeroApi(
        integrationMap["xero"],
        "getInvoices",
        moment().add(-4, "d"),
        "",
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

    knex = await getKnex(integrationMap["postgres"]);
    trx = await knex.transaction();

    let products = await trx.table("products").select();

    let productMap = {};
    products.forEach((item) => {
      productMap[item.code] = item;
    });

    let customers = await trx.table("customers").select();

    let customersMapExternalId = {};

    customers.forEach((item) => {
      if (item.external_id && item.external_id.length > 0)
        customersMapExternalId[item.external_id] = item.id;
    });

    xeroInvoices = xeroInvoices.invoices.filter((item) => {
      return (
        item.type == "ACCREC" &&
        (item.status == "AUTHORISED" || item.status == "PAID")
      );
    });

    for (let index = 0; index < xeroInvoices.length; index++) {
      const item = xeroInvoices[index];
      let pgInvoice = await trx
        .table("invoices")
        .select()
        .orWhere("number", item.invoiceNumber)
        .orWhere("number", "0010000" + item.invoiceNumber)
        .orWhere("external_id", item.invoiceID)
        .first();
      try {
        if (!pgInvoice)
          await insertInvoice(
            trx,
            item,
            "FA",
            productMap,
            customersMapExternalId
          );
        else
          await updateInvoice(
            trx,
            item,
            "FA",
            productMap,
            customersMapExternalId
          );
      } catch (e) {
        console.log(e);
      }
    }

    xeroNcs = xeroNcs.creditNotes.filter((item) => {
      return (
        item.type == "ACCRECCREDIT" &&
        (item.status == "AUTHORISED" || item.status == "PAID")
      );
    });

    for (let index = 0; index < xeroNcs.length; index++) {
      const item = xeroNcs[index];
      let pgInvoice = await trx
        .table("invoices")
        .select()
        .orWhere("number", item.creditNoteNumber)
        .orWhere("number", "0010000" + item.creditNoteNumber)
        .orWhere("external_id", item.creditNoteID)
        .first();
      try {
        if (!pgInvoice)
          await insertInvoice(
            trx,
            item,
            "NC",
            productMap,
            customersMapExternalId
          );
        else
          await updateInvoice(
            trx,
            item,
            "NC",
            productMap,
            customersMapExternalId
          );
      } catch (e) {
        console.log(e);
      }
    }

    await trx.commit();
    await knex.destroy();

    process.exit(0);
  } catch (e) {
    if (trx) await trx.rollback();
    knex && (await knex.destroy());
    redis && console.log(e);
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

async function insertInvoice(
  knex,
  invoice,
  type,
  productMap,
  customersMapExternalId
) {
  invoice.currencyRate = 1 / (invoice.currencyRate || 1) || 1;
  let multiplier =
    type == "FA" ? invoice.currencyRate : invoice.currencyRate * -1;
  let customer_id =
    invoice.contact.contactNumber ||
    customersMapExternalId[invoice.contact.contactID];
  if (parseInt(customer_id) > 0) customer_id = parseInt(customer_id);

  const pgInvoice = await knex
    .table("invoices")
    .insert({
      updated_at: moment().toISOString(),
      date: moment(invoice.date).toISOString(),
      credit_term: moment(invoice.dueDate).diff(moment(invoice.date), "days"),
      invoice_type: type,
      number: invoice.invoiceNumber || invoice.creditNoteNumber,
      code: "",
      customer_id: customer_id,
      external_id: invoice.invoiceID || invoice.creditNoteID,
      discount: (invoice.totalDiscount || 0) * multiplier,
      tax: (invoice.totalTax || 0) * multiplier,
      sub_total: invoice.subTotal * multiplier,
      total: invoice.total * multiplier,
      balance: (invoice.amountDue || invoice.remainingCredit || 0) * multiplier,
    })
    .returning("id");

  await knex.table("items").del().whereIn("invoice_id", pgInvoice);

  await insertItems(
    knex,
    invoice,
    pgInvoice[0],
    productMap,
    customer_id,
    multiplier
  );
}

async function updateInvoice(
  knex,
  invoice,
  type,
  productMap,
  customersMapExternalId
) {
  invoice.currencyRate = invoice.currencyRate || 1;
  let multiplier =
    type == "FA" ? invoice.currencyRate : invoice.currencyRate * -1;
  let customer_id =
    invoice.contact.contactNumber ||
    customersMapExternalId[invoice.contact.contactID];
  if (parseInt(customer_id) > 0) customer_id = parseInt(customer_id);

  if (moment(invoice.date).isBefore(moment("2020-05-31"))) {
    let res = await knex
      .table("invoices")
      .update({
        external_id: invoice.invoiceID || invoice.creditNoteID,
        discount: (invoice.totalDiscount || 0) * multiplier,
        tax: invoice.totalTax * multiplier,
        sub_total: invoice.subTotal * multiplier,
        total: invoice.total * multiplier,
        balance:
          (invoice.amountDue || invoice.remainingCredit || 0) * multiplier,
      })
      .orWhere(
        "number",
        "0010000" + (invoice.invoiceNumber || invoice.creditNoteNumber)
      )
      .orWhere("number", invoice.invoiceNumber || invoice.creditNoteNumber)

      .returning("id");
  } else {
    const pgInvoice = await knex
      .table("invoices")
      .update({
        updated_at: moment().toISOString(),
        date: moment(invoice.date).toISOString(),
        invoice_type: type,
        number: invoice.invoiceNumber || invoice.creditNoteNumber,
        code: "",
        credit_term: moment(invoice.dueDate).diff(moment(invoice.date), "days"),
        customer_id: customer_id,
        external_id: invoice.invoiceID || invoice.creditNoteID,
        discount: (invoice.totalDiscount || 0) * multiplier,
        tax: invoice.totalTax * multiplier,
        sub_total: invoice.subTotal * multiplier,
        total: invoice.total * multiplier,
        balance:
          (invoice.amountDue || invoice.remainingCredit || 0) * multiplier,
      })
      .where("number", invoice.invoiceNumber || invoice.creditNoteNumber)
      .andWhere("invoice_type", type)
      .returning("id");

    await knex.table("items").del().whereIn("invoice_id", pgInvoice);

    await insertItems(
      knex,
      invoice,
      pgInvoice[0],
      productMap,
      customer_id,
      multiplier
    );
  }
}

async function insertItems(
  knex,
  invoice,
  invoice_id,
  productMap,
  customer_id,
  multiplier
) {
  for (let index = 0; index < invoice.lineItems.length; index++) {
    const item = invoice.lineItems[index];

    let discount = 0;
    try {
      if (item.discountRate && item.unitAmount) {
        discount =
          (item.lineAmount - item.taxAmount - item.quantity * item.unitAmount) *
          multiplier;
      }
    } catch (e) {}

    if (item.itemCode && item.lineItemID) {
      if (!productMap[item.itemCode])
        throw "code not found " + JSON.stringify(item);

      await knex.table("items").insert({
        invoice_id: invoice_id,
        updated_at: moment().toISOString(),
        amount: item.quantity,
        price: Math.abs(item.unitAmount * multiplier),
        date: moment(invoice.date).add(1, "s").format("YYYY-MM-DD"),
        tax: item.taxAmount * multiplier,
        total: item.lineAmount * multiplier,
        cost: productMap[item.itemCode].cost,
        product_code: item.itemCode,
        external_id: item.lineItemID,

        discount: discount,
      });
    }
  }
}
