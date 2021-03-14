const { getModel } = require("../../models");

module.exports = async (req, res, next) => {
  try {
    if (req.body.sort && req.body.sort.field) {
      req.body.sort.column = req.body.sort.field;
      delete req.body.sort.field;
      req.body.sort = [req.body.sort];
    }
    if (req.body.filter && req.body.filter.q) {
      req.body.filter.name = `%${req.body.filter.q}%`;
      delete req.body.filter.q;
    }
    const getList = getModel("getList");
    const { results, count } = await getList(
      req.baseUrl.replace("/api/", "").replace("/vpi/", ""),
      req.body,
      req.knexPg
    );
    return res.send({ results, count });
  } catch (e) {
    return next(e);
  }
};
