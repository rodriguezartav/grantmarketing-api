var express = require("express");

const create = require("./create");
const update = require("./update");
const updateMany = require("./updateMany");
const deleteMany = require("./deleteMany");
const deleteOne = require("./deleteOne");
const getList = require("./getList");
const getOne = require("./getOne");
const getMany = require("./getMany");
const increment = require("./increment");
const getSum = require("./getSum");
const getManyReference = require("./getManyReference");

var modelMap = {
  create: create,
  update: update,
  increment: increment,
  updateMany: updateMany,
  deleteMany: deleteMany,
  deleteOne: deleteOne,
  getList: getList.default,
  getSum: getSum,
  getOne: getOne,
  getMany: getMany,
  getManyReference: getManyReference,
};

function getModel(modelName) {
  return modelMap[modelName];
}

function getModels(models) {
  var modelMap = {};

  models.forEach((model) => {
    modelMap[model] = getModel(model);
  });
  return modelMap;
}

function getRouter() {
  var router = express.Router();
  router.post("/getList", getModel("getList"));
  router.post("/getMany", getModel("getMany"));
  router.post("/getManyReference", getModel("getManyReference"));

  router.post("/updateMany", getModel("updateMany"));
  router.put("/:id", getModel("update"));
  router.get("/:id", getModel("getOne"));

  router.post("/", getModel("create"));
  router.delete("/:id", getModel("deleteOne"));
  router.delete("/", getModel("deleteMany"));
  return router;
}

module.exports = {
  getRouter,
  getModels,
  getModel,
};
