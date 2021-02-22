"use strict";

exports.up = function (knex, Promise) {
  return knex.schema.alterTable("providers", function (table) {
    table.boolean("requires_configuration").default(false);
  });
};

exports.down = function (knex, Promise) {
  return knex.schema.alterTable("providers", function (table) {
    table.dropColumn("requires_configuration");
  });
};
