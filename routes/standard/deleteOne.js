const { getModel } = require("../../models");

module.exports = async (req, res, next) => {
  try {
    const deleteOne = getModel("deleteOne");
    await deleteOne(
      req.baseUrl.replace("/api/", ""),
      req.body || req.query,
      req.knex
    );

    res.send({});
  } catch (e) {
    return next(e);
  }
};
