const { getModel } = require("../../models");

module.exports = async (req, res, next) => {
  try {
    const updateMany = getModel("updateMany");
    const getMany = getModel("getMany");
    if (req.body.data.items_json)
      req.body.data.items_json = { items: req.body.data.items_json };

    const updatedRecords = await updateMany(
      req.baseUrl.replace("/api/", "").replace("/vpi/", ""),
      req.body.data,
      req.body.ids,
      req.knexPg
    );

    res.send(updatedRecords);
  } catch (e) {
    return next(e);
  }
};
