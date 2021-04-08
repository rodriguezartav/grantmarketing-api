module.exports = async function (knex, customer_id) {
  const integrations = await knex
    .table("integrations")
    .select("integrations.*", "providers.name as provider")
    .join("providers", "providers.id", "integrations.provider_id")
    .join("customers", "customers.id", "integrations.customer_id")
    .where(
      typeof customer_id == "string" ? "customers.name" : "customer_id",
      typeof customer_id == "string" ? "ilike" : "=",
      customer_id
    );

  const integrationTokens = await knex
    .table("integration_tokens")
    .select("integration_tokens.*", "providers.name as provider")
    .join("providers", "providers.id", "integration_tokens.provider_id");

  let integrationMap = {};
  integrations.forEach((item) => {
    integrationMap[item.provider] = item;

    const integrationToken = integrationTokens.filter(
      (integrationTok) => integrationTok.provider_id == item.provider_id
    )[0];

    if (integrationToken) {
      integrationMap[item.provider].client_id = integrationToken.client_id;
      integrationMap[item.provider].client_secret =
        integrationToken.client_secret;

      if (integrationToken.application_id && !item.application_id)
        integrationMap[item.provider].application_id =
          integrationToken.application_id;
    }
  });

  return integrationMap;
};
