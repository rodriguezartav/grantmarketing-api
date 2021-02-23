"use strict";

exports.up = function (knex, Promise) {
  return knex.schema.createTable("integration_tokens", function (table) {
    table.increments();
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("updated_at").defaultTo(knex.fn.now());
    table.integer("provider_id").notNullable();
    table.string("client_id").notNullable();
    table.string("client_secret").notNullable();
    table.string("application_id");
  });
};

exports.down = function (knex, Promise) {
  return knex.schema.dropTable("integration_tokens");
};
