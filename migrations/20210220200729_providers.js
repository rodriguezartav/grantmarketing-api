"use strict";

exports.up = function (knex, Promise) {
  return knex.schema.createTable("providers", function (table) {
    table.increments();
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("updated_at").defaultTo(knex.fn.now());
    table.string("name").notNullable();
    table.string("type").notNullable();
  });
};

exports.down = function (knex, Promise) {
  return knex.schema.dropTable("providers");
};
