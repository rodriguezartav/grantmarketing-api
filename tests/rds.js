const moment = require("moment");
const Rds = require("../helpers/rds");

async function test() {
  const lines = new Rds();
  knex = lines.knex;

  await lines.registerTable("activities", {
    name: "test",
    num: 33.3,
    bool: true,
    date: moment().toDate(),
  });

  const insertedItems = await lines.execute(
    knex
      .table("activities")
      .insert({
        name: "test",
        num: 33.3,
        bool: true,
        date: moment().toDate(),
      })
      .returning("*")
  );

  const items = await lines.execute(knex.table("activities").select());

  const update = await lines.execute(
    knex.table("activities").update({
      ...insertedItems[0],
      name: "test 2",
    })
  );

  const itemsUpdated = await lines.execute(
    knex.table("activities").select().where("name", "test 2")
  );

  await lines.execute(
    knex.table("activities").del().where({
      id: insertedItems[0].id,
    })
  );
}

test();
