const { getModel } = require("../../models");
const queryString = require("querystring");

module.exports = async (req, res, next) => {
  try {
    const getOne = getModel("getOne");
    var result = await getOne(
      req.baseUrl.replace("/api/", "").replace("/vpi/", ""),
      {
        id: req.params.id,
        ...queryString.parse(req.query || ""),
      },
      req.knexPg
    );

    if (!result) return next({ status: 404 });
    res.send(result);
  } catch (e) {
    return next(e);
  }
};
