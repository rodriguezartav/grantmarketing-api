"use strict";

exports.up = function (knex, Promise) {
  return knex.schema.createTable("script_logs", function (table) {
    table.increments();
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("updated_at").defaultTo(knex.fn.now());
    table.integer("script_id").notNullable();
    table.integer("job_id");
    table.jsonb("log");
  });
};

exports.down = function (knex, Promise) {
  return knex.schema.dropTable("script_logs");
};
