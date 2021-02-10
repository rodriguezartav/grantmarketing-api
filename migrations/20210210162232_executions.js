"use strict";

exports.up = function (knex, Promise) {
  return knex.schema.createTable("executions", function (table) {
    table.increments();
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("updated_at").defaultTo(knex.fn.now());
    table.integer("schedule_id").notNullable();
    table.integer("result");
  });
};

exports.down = function (knex, Promise) {
  return knex.schema.dropTable("executions");
};
