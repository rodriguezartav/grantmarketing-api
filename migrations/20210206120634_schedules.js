"use strict";

exports.up = function (knex, Promise) {
  return knex.schema.createTable("schedules", function (table) {
    table.increments();
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("updated_at").defaultTo(knex.fn.now());
    table.integer("customer_id").notNullable();
    table.integer("script_id").notNullable();
    table.integer("period_in_minutes");
    table.timestamp("last_run").defaultTo(knex.fn.now());
  });
};

exports.down = function (knex, Promise) {
  return knex.schema.dropTable("schedules");
};
