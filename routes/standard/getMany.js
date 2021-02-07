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
    const getMany = getModel("getMany");
    var results = await getMany(req.baseUrl.replace("/api/", ""), {
      "id,IN": req.body.ids,
    });

    results.forEach((result) => {
      if (result.items_json) result.items_json = result.items_json.items;
    });

    return res.send(results);
  } catch (e) {
    return next(e);
  }
};
