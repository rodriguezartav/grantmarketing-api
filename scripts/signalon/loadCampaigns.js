const moment = require("moment");
const request = require("superagent");
const Marketo = require("../../helpers/marketo");
const Knex = require("../../helpers/knex_pg");

let knex;
module.exports = async function Run(integrationMap) {
  try {
    const knex = Knex(integrationMap["postgres"]);

    const first = await knex
      .table("campaigns")
      .select("updated_at")
      .orderBy("updated_at", "DESC")
      .first();

    const startFilter =
      first && first.updated_at
        ? moment(first.updated_at)
        : moment().add(-7, "months");

    const campaigns = await Marketo.getBulk(
      integrationMap["marketo"],
      `/rest/asset/v1/smartCampaigns.json?earliestUpdatedAt=${startFilter.toISOString()}&latestUpdatedAt=${startFilter
        .add(7, "months")
        .toISOString()}`
    );

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
          program_id: campaign.parentProgramId,
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
      await knex.table("campaigns").insert(temparray).onConflict("id").merge();
    }

    await knex.destroy();
  } catch (e) {
    console.log(e);

    throw e;
  }
};
