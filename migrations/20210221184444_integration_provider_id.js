"use strict";

exports.up = function (knex, Promise) {
  return knex.schema.alterTable("integrations", function (table) {
    table.integer("provider_id");
  });
};

exports.down = function (knex, Promise) {
  return knex.schema.alterTable("integrations", function (table) {
    table.dropColumn("provider_id");
  });
};
