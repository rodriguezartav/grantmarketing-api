"use strict";

exports.up = function (knex, Promise) {
  return knex.schema.alterTable("scripts", function (table) {
    table.text("description");
  });
};

exports.down = function (knex, Promise) {
  return knex.schema.alterTable("scripts", function (table) {
    table.dropColumn("description");
  });
};
