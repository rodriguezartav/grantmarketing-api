const moment = require("moment");
const request = require("superagent");
const Marketo = require("../../helpers/marketo");
const Knex = require("../../helpers/knex_pg");

let knex;
module.exports = async function Run(integrationMap) {
  try {
    const programs = await Marketo.getBulk(
      integrationMap["marketo"],
      "/rest/asset/v1/programs.json"
    );

    const knex = Knex(integrationMap["postgres"]);

    var i,
      j,
      temparray,
      chunk = 500;
    for (i = 0, j = programs.length; i < j; i += chunk) {
      temparray = programs.slice(i, i + chunk).map((program) => {
        return {
          id: program.id,
          name: program.name,
          description: program.description,
          created_at: program.createdAt,
          updated_at: program.updatedAt,
          status: program.status,
          type: program.type,
          channel: program.channel,
          url: program.url,
          folder_id: program.folder ? program.folder.value : null,
          folder_name: program.folder ? program.folder.folderName : null,
        };
      });
      await knex.table("programs").insert(temparray).onConflict("id").merge();
    }

    await knex.destroy();
  } catch (e) {
    console.log(e);

    throw e;
  }
};
