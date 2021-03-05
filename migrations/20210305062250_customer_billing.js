"use strict";

exports.up = function (knex, Promise) {
  return knex.schema.alterTable("customers", function (table) {
    table.string("billing_email");
    table.string("country");
  });
};

exports.down = function (knex, Promise) {
  return knex.schema.alterTable("customers", function (table) {
    table.dropColumn("billing_email");
    table.dropColumn("country");
  });
};
