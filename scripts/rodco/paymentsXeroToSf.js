const moment = require("moment");
const { xeroApi, redis } = require("../../helpers/xero");
const { sfConn, bulk, query } = require("../../helpers/sf");

module.exports = async function Run(integrationMap) {
  let xeroPayments = await xeroApi(
    integrationMap["xero"],
    "getPayments",
    moment().add(-4, "d")
  );

  let xeroBatchPayments = await xeroApi(
    integrationMap["xero"],
    "getBatchPayments",
    moment().add(-4, "d").toDate()
  );

  const referenceMap = {};
  xeroBatchPayments = xeroBatchPayments.batchPayments;
  xeroBatchPayments.forEach((batchPayment) => {
    batchPayment.payments.forEach((payment) => {
      referenceMap[payment.paymentID] = batchPayment.reference;
    });
  });

  xeroPayments = xeroPayments.payments.filter((item) => {
    return (
      item.paymentType == "ACCRECPAYMENT" &&
      (item.status == "AUTHORISED" || item.status == "DELETED")
    );
  });

  const conn = await sfConn(integrationMap["salesforce"]);

  const clientes = await query(conn, "select id,external_id__c from account ");

  const facturas = await query(
    conn,
    "select id,external_id__c from factura__c order by fecha__c desc"
  );

  const facturasMap = {};
  facturas.forEach((item) => {
    facturasMap[item.external_id__c] = item.id;
  });

  const clientesMap = {};
  clientes.forEach((item) => {
    clientesMap[item.external_id__c] = item.id;
  });

  const sfPayments = [];

  for (let index = 0; index < xeroPayments.length; index++) {
    const item = xeroPayments[index];
    if (item.invoice) {
      sfPayments.push({
        external_id__c: item.paymentID,
        factura__c: facturasMap[item.invoice.invoiceID],
        cuenta__c: clientesMap[item.invoice.contact.contactID],
        fecha__c: moment(item.date).format("YYYY-MM-DD"),
        monto__c: item.status == "DELETED" ? 0 : item.amount,
      });
    }
  }
  await bulk(conn, "pago__c", "upsert", "external_id__c", sfPayments);
};
