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

    var i,
      j,
      temparray,
      chunk = 500;
    for (i = 0, j = emails.length; i < j; i += chunk) {
      temparray = emails.slice(i, i + chunk).map((email) => {
        return {
          id: email.id,
          name: email.name,
          from_name: email.fromName.value,
          from_email: email.fromEmail.value,
          description: email.description,
          created_at: email.createdAt,
          updated_at: email.updatedAt,
          status: email.status,
          version: email.version,
          operational: email.operational,
          template: email.template,
          subject: email.subject.value,
          folder_id: email.folder ? email.folder.value : null,
          folder_name: email.folder ? email.folder.folderName : null,
          folder_type: email.folder ? email.folder.type : null,

          //contents: { list: emailContents },
        };
      });
      await knex.table("emails").insert(temparray).onConflict("id").merge();
    }

    await knex.destroy();
  } catch (e) {
    console.log(e);

    throw e;
  }
};
