"use strict";

exports.up = function (knex, Promise) {
  return knex.schema.createTable("jobs", function (table) {
    table.increments();
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("updated_at").defaultTo(knex.fn.now());
    table.integer("customer_id").notNullable();
    table.integer("script_id").notNullable();
    table.integer("schedule_id").notNullable();
    table.string("status");
    table.jsonb("result");
    table.timestamp("completed_at").defaultTo(knex.fn.now());
  });
};

exports.down = function (knex, Promise) {
  return knex.schema.dropTable("jobs");
};
