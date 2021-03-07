var express = require("express");
var router = express.Router();
const JWT = require("../../../helpers/jwt");
const Knex = require("../../../helpers/knex");
const moment = require("moment");

const jwt_decode = require("jwt-decode");
const IntegrationMap = require("../../../helpers/integrationMap");
const CustomerIO = require("../../../helpers/customerio");
const { sfConn, bulk, query, insertContact } = require("../../../helpers/sf");

const request = require("superagent");

router.post("/", async function ({ body }, res, next) {
  const knex = Knex();
  const integrationMap = await IntegrationMap(knex, 1);
  const conn = await sfConn(integrationMap["salesforce"]);
  const cio = CustomerIO(integrationMap["customerio"]);

  let identification = null;
  let mobile = null;
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

  try {
    await cio.track(contact.id, { name: "ORDER" });

    if (discount_codes.length > 0)
      await cio.track(contact.id, { name: discount_codes[0].code });

    await request
      .post(
        "https://hooks.slack.com/services/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"
      )
      .send({
        username: "Shopify",
        text: `Venta Shopify de ${customerName} por ${total_price} ${order_status_url}`,
      });
  } catch (e) {
    console.log(e);
  }

  return res.json({});
});

module.exports = router;
