"use strict";

exports.up = function (knex, Promise) {
  return knex.schema.createTable("users", function (table) {
    table.increments();
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("updated_at").defaultTo(knex.fn.now());
    table.string("name").notNullable();
    table.integer("customer_id");
    table.string("phone");
    table.integer("code");
  });
};

exports.down = function (knex, Promise) {
  return knex.schema.dropTable("users");
};
