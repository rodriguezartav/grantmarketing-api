const moment = require("moment");
const request = require("superagent");
const Marketo = require("../../helpers/marketo");
const Knex = require("../../helpers/knex_pg");

let knex;
module.exports = async function Run(integrationMap) {
  try {
    const smartLists = await Marketo.getBulk(
      integrationMap["marketo"],
      "/rest/asset/v1/smartLists.json"
    );

    const knex = Knex(integrationMap["postgres"]);

    for (let index = 0; index < smartLists.length; index++) {
      const smartList = smartLists[index];
      await knex
        .table("smart_lists")
        .insert({
          id: smartList.id,
          name: smartList.name,
          created_at: smartList.createdAt,
          updated_at: smartList.updatedAt,
          folder_id: smartList.folder ? smartList.folder.id : null,
          folder_type: smartList.folder ? smartList.folder.type : null,
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
