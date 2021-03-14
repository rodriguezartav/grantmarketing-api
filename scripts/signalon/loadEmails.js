const moment = require("moment");
const request = require("superagent");
const Marketo = require("../../helpers/marketo");
const Knex = require("../../helpers/knex_pg");

let knex;
module.exports = async function Run(integrationMap) {
  try {
    const emails = await Marketo.getBulk(
      integrationMap["marketo"],
      "/rest/asset/v1/emails.json"
    );

    const knex = Knex(integrationMap["postgres"]);

    for (let index = 0; index < emails.length; index++) {
      const email = emails[index];

      const emailContents = await Marketo.getBulk(
        integrationMap["marketo"],
        `/rest/asset/v1/email/${email.id}/content.json`
      );

      await knex
        .table("emails")
        .insert({
          id: email.id,
          name: email.name,
          from_name: email.fromName.value,
          description: email.description,
          created_at: email.createdAt,
          updated_at: email.updatedAt,
          status: email.status,
          version: email.version,
          operational: email.operational,
          template: email.template,
          subject: email.subject.value,
          contents: { list: emailContents },
        })
        .onConflict("id")
        .merge();
    }

    await knex.destroy();
  } catch (e) {
    console.log(e);

    throw e;
  }
};
