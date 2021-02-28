const moment = require("moment");
const { xeroApi, redis } = require("../../helpers/xero");
const getKnex = require("../../helpers/knex_pg");

module.exports = async function Run(integrationMap) {
  try {
    knex = await getKnex(integrationMap["postgres"]);
    trx = await knex.transaction();

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

    for (let index = 0; index < xeroPayments.length; index++) {
      const item = xeroPayments[index];
      if (item.invoice) {
        try {
          let pgInvoice = await trx
            .table("invoices")
            .select()
            .where("external_id", item.invoice.invoiceID)
            .orWhere("number", item.invoice.invoiceNumber)
            .orWhere("number", "0010000" + item.invoice.invoiceNumber)
            .first();

          let pgPayment = await trx
            .table("payments")
            .select()
            .where("external_id", item.paymentID)
            .first();

          if (item.status == "DELETED")
            await trx
              .table("payments")
              .delete()
              .where("external_id", item.paymentID);
          else if (!pgPayment && pgInvoice) {
            await trx.table("payments").insert({
              external_id: item.paymentID,
              customer_id: pgInvoice.customer_id,
              invoice_id: pgInvoice.id,
              invoice_number: pgInvoice.number,
              updated_at: moment().toISOString(),
              date: moment(item.date).format("YYYY-MM-DD"),
              reference: item.reference || referenceMap[item.paymentID],
              total: item.amount,
            });
          } else if (pgPayment && pgInvoice) {
            //const parts = item.reference.split("//");
            await trx
              .table("payments")
              .update({
                reference: item.reference || referenceMap[item.paymentID],
              })
              .where({ external_id: item.paymentID });
          }
        } catch (e) {
          console.log(e);
        }
      }
    }

    await trx.commit();
    knex && (await knex.destroy());
  } catch (e) {
    if (trx) await trx.rollback();
    knex && (await knex.destroy());
    redis && console.log(e);
    process.exit(1);
  }
};
