"use strict";

exports.up = function (knex, Promise) {
  return knex.schema.createTable("customers", function (table) {
    table.increments();
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("updated_at").defaultTo(knex.fn.now());
    table.string("name").notNullable();
    table.string("description").notNullable();
    table.string("address");
    table.string("state");
    table.string("zipcode");
    table.string("tags");
  });
};

exports.down = function (knex, Promise) {
  return knex.schema.dropTable("customers");
};
