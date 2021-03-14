const { getModel } = require("../../models");

module.exports = async (req, res, next) => {
  try {
    const table = req.baseUrl.replace("/api/", "");
    let data = req.body.data;

    const schema = require("../../schemas/" + table + ".json");
    if (schema.properties.created_by_user_id)
      data.created_by_user_id = req.user.id;

    const create = getModel("create");
    var createResult = await create(table, data, req.knexPg);

    return res.send(createResult);
  } catch (e) {
    console.log(e);

    return next({
      status: 400,
      message: e.message || e.detail,
      errors: e.errors,
    });
  }
};
