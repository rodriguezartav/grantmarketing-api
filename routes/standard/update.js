const { getModel } = require("../../models");
const moment = require("moment");

module.exports = async (req, res, next) => {
  try {
    const resource = req.baseUrl.replace("/api/", "");
    let update = getModel("update");
    let getOne = getModel("getOne");
    let data = req.body;
    delete data.id;

    const original = await getOne(resource, { id: req.params.id }, req.knexPg);

    if (original.achived || (original.status && original.status == "archived"))
      return next({
        status: 409,
        message: `${resource} #${req.params.id} ya esta archivado`,
      });
    const updatedItem = await update(
      resource,
      data,
      { id: req.params.id },
      req.knexPg
    );

    res.send(updatedItem);
  } catch (e) {
    if (e.detail)
      return next({
        status: 400,
        message: e.detail || e.message,
        errors: e.errors,
      });

    return next(e);
  }
};
