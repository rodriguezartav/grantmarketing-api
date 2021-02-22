"use strict";

exports.up = function (knex, Promise) {
  return knex.schema.createTable("script_assignments", function (table) {
    table.increments();
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("updated_at").defaultTo(knex.fn.now());
    table.string("script_id").notNullable();
    table.string("customer_id").notNullable();
  });
};

exports.down = function (knex, Promise) {
  return knex.schema.dropTable("script_assignments");
};
