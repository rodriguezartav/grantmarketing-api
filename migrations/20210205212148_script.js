"use strict";

exports.up = function (knex, Promise) {
  return knex.schema.createTable("scripts", function (table) {
    table.increments();
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("updated_at").defaultTo(knex.fn.now());
    table.string("name");
    table.string("location");
  });
};

exports.down = function (knex, Promise) {
  return knex.schema.dropTable("scripts");
};
