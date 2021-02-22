"use strict";

exports.up = function (knex, Promise) {
  return knex.schema.alterTable("scripts", function (table) {
    table.boolean("public").default(true);
  });
};

exports.down = function (knex, Promise) {
  return knex.schema.alterTable("scripts", function (table) {
    table.dropColumn("public");
  });
};
