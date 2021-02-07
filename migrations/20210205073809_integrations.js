"use strict";

exports.up = function (knex, Promise) {
  return knex.schema.createTable("integrations", function (table) {
    table.increments();
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("updated_at").defaultTo(knex.fn.now());
    table.integer("customer_id").notNullable();
    table.string("provider_name");
    table.string("external_user_id");
    table.string("external_user_name");
    table.text("application_id");
    table.text("api_key");

    table.text("auth_token");
    table.text("refresh_token");
    table.timestamp("expiry_date");
    table.string("client_id");
    table.string("client_secret");

    table.text("private_key");
    table.text("certificate");
  });
};

exports.down = function (knex, Promise) {
  return knex.schema.dropTable("integrations");
};
