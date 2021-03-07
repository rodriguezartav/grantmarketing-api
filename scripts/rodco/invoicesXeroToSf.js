const moment = require("moment");
const { xeroApi, redis } = require("../../helpers/xero");
const { sfConn, bulk, query } = require("../../helpers/sf");

const DAYS = 2;

module.exports = async function Run(integrationMap) {
  let productCosts = {};

  const itemsGetResponse = await xeroApi(integrationMap["xero"], "getItems");

  itemsGetResponse.items.forEach((item) => {
    productCosts[item.code] = item.purchaseDetails.unitPrice;
  });

  let xeroNcs = { creditNotes: [] };
  let index = 1;
  while (index < DAYS) {
    let response = await xeroApi(
      integrationMap["xero"],
      "getCreditNotes",
      moment().add(-DAYS, "d"),
      "",
      "date",
      [],
      [],
      [],
      ["AUTHORISED", "PAID"],
      index
    );
    if (
      response.creditNotes.length == 0 ||
      (index == 1 && response.creditNotes.length < 100)
    ) {
      index = DAYS;
    }
    xeroNcs.creditNotes = xeroNcs.creditNotes.concat(response.creditNotes);
    index++;
  }

  let xeroInvoices = { invoices: [] };
  index = 1;
  while (index < DAYS) {
    let response = await xeroApi(
      integrationMap["xero"],
      "getInvoices",
      moment().add(-DAYS, "d"),
      "",
      "date",
      [],
      [],
      [],
      ["AUTHORISED", "PAID"],
      index
    );
    if (response.invoices.length == 0) {
      index = DAYS;
    }
    xeroInvoices.invoices = xeroInvoices.invoices.concat(response.invoices);
    index++;
  }

  const invoiceMap = {};
  xeroInvoices.invoices.forEach((item) => {
    invoiceMap[item.invoiceID] = item;
  });

  const nCMap = {};
  xeroNcs.creditNotes.forEach((item) => {
    nCMap[item.creditNoteID] = item;
  });

  xeroInvoices = Object.values(invoiceMap).filter((item, index, self) => {
    return (
      item.type == "ACCREC" &&
      (item.status == "AUTHORISED" || item.status == "PAID")
    );
  });

  xeroNcs = Object.values(nCMap).filter((item, index, self) => {
    return (
      item.type == "ACCRECCREDIT" &&
      (item.status == "AUTHORISED" || item.status == "PAID")
    );
  });

  xeroInvoices = xeroInvoices.concat(xeroNcs);

  const conn = await sfConn(integrationMap["salesforce"]);

  const clientes = await query(
    conn,
    "select id,external_id__c,saldo__c from account"
  );
  const clientesMap = {};
  clientes.forEach((item) => {
    clientesMap[item.external_id__c] = item;
  });

  const productos = await query(
    conn,
    "select id,codigo__c,costo__c from producto__c "
  );
  const productosMap = {};
  productos.forEach((item) => {
    productosMap[item.codigo__c] = item;
  });

  const items = xeroInvoices.map((item) => {
    let account = clientesMap[item.contact.contactID];
    if (account) clientesMap[item.contact.contactID].Saldo__c = 0;

    const multiplier = item.invoiceNumber ? 1 : -1;

    let total = (item.total || 0) * multiplier;
    let saldo = (item.amountDue || item.remainingCredit || 0) * multiplier;
    let impuestos = (item.totalTax || 0) * multiplier;

    if (item.currencyCode != "CRC") {
      total = item.total / item.currencyRate;
      saldo = saldo / item.currencyRate;
      impuestos = impuestos / item.currencyRate;
    }

    if (account && saldo != null) {
      clientesMap[item.contact.contactID].Saldo__c += saldo;
    }

    var invoiceSql = {
      name: item.invoiceNumber || item.creditNoteNumber,
      external_id__c: item.invoiceID || item.creditNoteID,
      cuenta__c: account ? account.Id : null,
      total__c: total,
      impuesto__c: impuestos,
      fecha__c: moment(item.date).format("YYYY-MM-DD"),
      vence__c: moment(item.dueDate).format("YYYY-MM-DD"),
      saldo__c: saldo,
    };

    return invoiceSql;
  });

  const facturasMap = await bulk(
    conn,
    "Factura__c",
    "upsert",
    "external_id__c",
    items
  );

  const lineItems = [];

  xeroInvoices.forEach((invoice) => {
    const account = clientesMap[invoice.contact.contactID];
    let multiplier = 1;
    if (invoice.currencyCode != "CRC") multiplier = 1 / invoice.currencyRate;
    if (!invoice.invoiceNumber) multiplier = multiplier * -1;
    invoice.lineItems.forEach((lineItem) => {
      if (lineItem.itemCode && lineItem.lineItemID) {
        const producto = productosMap[lineItem.itemCode];
        const cost = productCosts[lineItem.itemCode];

        const facturaId =
          facturasMap[invoice.invoiceID || invoice.creditNoteID];
        if (producto) {
          const valor = Math.abs(
            (lineItem.lineAmount / lineItem.quantity) * multiplier
          );
          lineItems.push({
            external_id__c: lineItem.lineItemID,
            producto__c: producto.Id,
            cuenta__c: account ? account.Id : null,
            costo__c: cost,
            factura__c: facturaId,
            cantidad__c: lineItem.quantity,
            valor__c: valor,
            Utilidad__c: (valor - cost) / valor,
            precio__c: Math.abs(lineItem.unitAmount * multiplier),
            impuesto__c: lineItem.taxAmount * multiplier,
            total__c: (lineItem.lineAmount + lineItem.taxAmount) * multiplier,
          });
        }
      }
    });
  });

  await bulk(conn, "Movimiento__c", "upsert", "external_id__c", lineItems);

  await bulk(
    conn,
    "Account",
    "upsert",
    "external_id__c",
    Object.values(clientesMap)
  );
};
