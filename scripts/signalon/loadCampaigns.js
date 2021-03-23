const moment = require("moment");
const request = require("superagent");
const Marketo = require("../../helpers/marketo");
const Knex = require("../../helpers/knex_pg");

let knex;
module.exports = async function Run(integrationMap) {
  try {
    const campaigns = await Marketo.getBulk(
      integrationMap["marketo"],
      `/rest/asset/v1/smartCampaigns.json?earliestUpdatedAt=2020-09-01T23:15:00-00:00&latestUpdatedAt=2021-03-12T23:17:00-00:00`
    );

    const knex = Knex(integrationMap["postgres"]);

    var i,
      j,
      temparray,
      chunk = 500;
    for (i = 0, j = campaigns.length; i < j; i += chunk) {
      temparray = campaigns.slice(i, i + chunk).map((campaign) => {
        return {
          id: campaign.id,
          name: campaign.name,
          description: campaign.description,

          created_at: campaign.createdAt,
          updated_at: campaign.updatedAt,

          status: campaign.status,

          type: campaign.type,
          is_system: campaign.isSystem,

          is_active: campaign.isActive,

          is_requestable: campaign.isRequestable,

          is_communication_limit_enabled: campaign.isCommunicationLimitEnabled,

          recurrence: campaign.recurrence,

          qualification_rule_type: campaign.qualificationRuleType,

          workspace: campaign.workspace,
          smart_list_id: campaign.smartListId,

          flow_id: campaign.flowId,

          computed_url: campaign.computedUrl,

          attributes: { list: campaign.attributes },
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
