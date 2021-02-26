"use strict";

exports.up = function (knex, Promise) {
  return knex.schema.alterTable("jobs", function (table) {
    table.jsonb("script_options");
  });
};

exports.down = function (knex, Promise) {
  return knex.schema.alterTable("jobs", function (table) {
    table.dropColumn("script_options");
  });
};
