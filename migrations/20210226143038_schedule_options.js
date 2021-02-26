"use strict";

exports.up = function (knex, Promise) {
  return knex.schema.alterTable("schedules", function (table) {
    table.jsonb("script_options");
  });
};

exports.down = function (knex, Promise) {
  return knex.schema.alterTable("schedules", function (table) {
    table.dropColumn("script_options");
  });
};
