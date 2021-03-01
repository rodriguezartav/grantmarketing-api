"use strict";

exports.up = function (knex, Promise) {
  return knex.schema.createTable("flows", function (table) {
    table.increments();
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("updated_at").defaultTo(knex.fn.now());
    table.integer("job_id");
    table.string("event_type");
    table.string("location");
    table.integer("customer_id");
    table.integer("script_id");
    table.integer("schedule_id");
    table.jsonb("events");
  });
};

exports.down = function (knex, Promise) {
  return knex.schema.dropTable("flows");
};
