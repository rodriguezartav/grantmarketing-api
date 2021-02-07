"use strict";

exports.up = function (knex, Promise) {
  return knex.schema.createTable("admins", function (table) {
    table.increments();
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("updated_at").defaultTo(knex.fn.now());
    table.string("name").notNullable();
    table.string("phone");
    table.boolean("tech_notifications").defaultTo(false);
    table.integer("code");
  });
};

exports.down = function (knex, Promise) {
  return knex.schema.dropTable("admins");
};
