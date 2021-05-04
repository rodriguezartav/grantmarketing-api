var express = require("express");

const create = require("./create");
const update = require("./update");
const updateMany = require("./updateMany");
const deleteMany = require("./deleteMany");
const deleteOne = require("./deleteOne");
const getList = require("./getList");
const getOne = require("./getOne");
const getMany = require("./getMany");
const getManyReference = require("./getManyReference");

function makeRouter(map = {}, more = {}) {
  var router = express.Router();
  Object.keys(more).forEach((itemName) => {
    router.post("/action/" + itemName, more[itemName]);
    router.get("/action/" + itemName, more[itemName]);
  });

  router.get("/getList", map["getList"] || getList);
  router.post("/getList", map["getList"] || getList);
  router.post("/getMany", map["getMany"] || getMany);
  router.post("/getManyReference", map["getManyReference"] || getManyReference);

  router.put("/updateMany", map["updateMany"] || updateMany);
  router.put("/:id", map["update"] || update);
  router.get("/:id", map["getOne"] || getOne);

  router.post("/", map["create"] || create);
  router.delete("/", map["deleteMany"] || deleteMany);
  router.delete("/:id", map["deleteOne"] || deleteOne);

  return router;
}

module.exports = {
  create,
  update,
  updateMany,
  deleteMany,
  deleteOne,
  getList,
  getOne,
  getMany,
  getManyReference,
  makeRouter,
};
