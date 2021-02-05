"use strict";

exports.up = function (knex, Promise) {
  return knex.schema.createTable("integrations", function (table) {
    table.increments();
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("updated_at").defaultTo(knex.fn.now());
    table.integer("customer_id").notNullable();
    table.string("name");
    table.jsonb("tokens");
    table.string("nextRefresh");
  });
};

exports.down = function (knex, Promise) {
  return knex.schema.dropTable("integrations");
};
