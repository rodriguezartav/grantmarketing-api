const client = require("@sendgrid/client");
client.setApiKey(
  "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"
);
const moment = require("moment");
const { xeroApi, redis } = require("../../helpers/xero");

const getKnex = require("../../helpers/knex_pg");

let knex;
module.exports = async function Run(integrationMap) {
  try {
    knex = await getKnex(integrationMap["postgres"]);

    var contacts = await knex
      .table("contacts")
      .select([
        "contacts.*",
        "address as customer_address",
        "customers.name as customer_name",
        "customers.credit_term as credit_term",
        "customer_reps.name as rep_name",
        "customer_regions.name as region_name",
      ])
      .leftJoin("customers", "customers.id", "contacts.customer_id")
      .leftJoin(
        "customer_reps",
        "customer_reps.id",
        "customers.customer_rep_id"
      )
      .leftJoin(
        "customer_regions",
        "customer_regions.id",
        "customers.customer_region_id"
      )

      .whereNotNull("email");

    const data = contacts
      .filter(
        (item) =>
          item.email &&
          item.email.indexOf(" ") == -1 &&
          item.email.indexOf("@") > 0 &&
          item.email.indexOf(".") > 0
      )
      .map((item) => {
        const names = item.name.split(" ");
        let tags = item.roles || "";

        tags = tags.split(",");

        if (item.credit_term && item.credit_term > 0)
          tags.push("d" + item.credit_term);

        tags = tags.join(",");

        return {
          first_name: names[0].toUpperCase(),
          last_name: names.slice(1).join(" ").toUpperCase(),
          email: item.email,
          custom_fields: {
            e1_T: tags,
            e2_T: (item.customer_name || "").toUpperCase(),
            e4_T: (item.region_name || "").toUpperCase(),
            e5_T: (item.rep_name || "").toUpperCase(),
          },
        };
      });

    var arrays = [],
      errors = [],
      size = 200;

    while (data.length > 0) arrays.push(data.splice(0, size));

    for (let index = 0; index < arrays.length; index++) {
      const element = arrays[index];
      const request = {};
      request.body = { contacts: element };
      request.method = "PUT";
      request.url = "/v3/marketing/contacts";
      try {
        const response = await client.request(request);
        console.log(response.statusCode);
        console.log(response.body);
      } catch (e) {
        for (let index = 0; index < e.response.body.errors.length; index++) {
          const element = e.response.body.errors[index];
          if (element.field.indexOf("email") > -1) {
            const email = element.message.split("'")[1];
            const ur = await knex
              .table("contacts")
              .update({ email: Knex.raw("NULL") })
              .where("email", email)
              .returning("id");
            console.log(ur);
          } else throw e;
        }
      }
    }

    await knex.destroy();
  } catch (e) {
    console.log(e);
    await knex.destroy();
    throw e;
  }
};
