const moment = require("moment");
const request = require("superagent");
const Marketo = require("../../helpers/marketo");
const Knex = require("../../helpers/knex_pg");

let knex;
module.exports = async function Run(integrationMap) {
  try {
    const campaigns = await Marketo.batch(
      "campaigns",
      fields,
      filter,
      integrationMap["marketo"]
    );

    const knex = Knex(integrationMap["postgres"]);

    for (let index = 0; index < activityTypes.length; index++) {
      const activityType = activityTypes[index];
      await knex.table("activity_types").insert({
        id: activityType.id,
        name: activityType.name,
        description: activityType.description,
        primary_attribute_name: activityType.primaryAttribute
          ? activityType.primaryAttribute.name
          : "",
        primary_attribute_type: activityType.primaryAttribute
          ? activityType.primaryAttribute.dataType
          : "",
        attributes: { list: activityType.attributes },
      });
    }

    await knex.destroy();
  } catch (e) {
    console.log(e);

    throw e;
  }
};
