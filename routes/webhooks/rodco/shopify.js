var express = require("express");
var router = express.Router();
const JWT = require("../../../helpers/jwt");
const Knex = require("../../../helpers/knex");
const moment = require("moment");
const superagent = require("superagent");
const jwt_decode = require("jwt-decode");
const IntegrationMap = require("../../../helpers/integrationMap");
const CustomerIO = require("../../../helpers/customerio");
const { sfConn, bulk, query, insertContact } = require("../../../helpers/sf");

router.post("/", async function ({ body }, res, next) {
  const knex = Knex();
  const integrationMap = await IntegrationMap(knex, 1);
  const conn = await sfConn(integrationMap["salesforce"]);
  const cio = CustomerIO(integrationMap["customerio"]);

  let identification, mobile;
  let customerName = "";
  let {
    email,
    phone,
    line_items,
    financial_status,
    note,
    name,
    order_number,
    total_price,
    shipping_address,
    shipping_lines,
    order_status_url,
    billing_address,

    discount_codes,
    payment_gateway_names,
  } = body;
  let orderCustomer = body.customer;

  //Parse Values
  if (phone && phone.length > 0) mobile = phone.replace("+506", "");
  if (note && note.lenght > 0)
    identification = note.split(" ").join("").split("-").join("").toLowerCase();
  if (
    shipping_address &&
    shipping_address.company &&
    shipping_address.company.length > 0
  )
    customerName = shipping_address.company;
  else customerName = orderCustomer.first_name + " " + orderCustomer.last_name;

  const address = shipping_address ? shipping_address.address1 : "";
  const city = shipping_address ? shipping_address.city : "";

  const contact = await insertContact(conn, {
    mobilePhone: mobile,
    phone: phone,
    firstName: orderCustomer.first_name,
    lastName: orderCustomer.last_name,
    leadSource: "shopify",
    department: billing_address.company,
    email: email,
  });

  await cio.track(contact.id, { name: "ORDER" });

  if (discount_codes.length > 0)
    await cio.track(contact.id, { name: discount_codes[0].code });

  try {
    await request
      .post(
        "https://hooks.slack.com/services/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"
      )
      .send({
        username: "Shopify",
        text: "Nueva Venta en línea por " + total_price,
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `${customerName} hizo un pedido para ${city}:\n*<${order_status_url}|Link al Pedido>*`,
            },
          },
          {
            type: "section",
            fields: [
              {
                type: "mrkdwn",
                text: `*Total:*\n${total_price}`,
              },
              {
                type: "mrkdwn",
                text: `*Forma de Pago:*\n${payment_gateway_names.join(",")}`,
              },
              {
                type: "mrkdwn",
                text: `*Descuentos:*\n${discount_codes
                  .map((item) => item.code)
                  .join(",")}`,
              },

              {
                type: "mrkdwn",
                text: `*Direccion:*\n${address}`,
              },
              {
                type: "mrkdwn",
                text: `*Cedula:*\n${identification || ""}`,
              },
              {
                type: "mrkdwn",
                text: `*CLV:*\n${orderCustomer.total_spent}`,
              },
            ],
          },
        ],
      });
  } catch (e) {
    console.log(e);
  }

  return res.json({});
});

module.exports = router;
