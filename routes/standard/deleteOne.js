const { getModel } = require("../../models");

module.exports = async (req, res, next) => {
  try {
    const deleteOne = getModel("deleteOne");
    await deleteOne(req.baseUrl.replace("/api/", ""), req.params, req.knexPg);

    res.send({});
  } catch (e) {
    return next(e);
  }
};
