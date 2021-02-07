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

    if (!req.body.id) res.send({ results: [], count: 0 });

    const getManyReference = getModel("getManyReference");
    const { results, count } = await getManyReference(
      req.baseUrl.replace("/api/", ""),
      req.body
    );
    return res.send({ results, count });
  } catch (e) {
    return next(e);
  }
};
