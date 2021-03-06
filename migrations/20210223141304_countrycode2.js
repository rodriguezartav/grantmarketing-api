"use strict";

exports.up = function (knex, Promise) {
  return knex.schema.alterTable("users", function (table) {
    table.string("country_code");
  });
};

exports.down = function (knex, Promise) {
  return knex.schema.alterTable("users", function (table) {
    table.dropColumn("country_code");
  });
};
