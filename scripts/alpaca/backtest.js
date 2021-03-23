if (!process.env.NODE_ENV) require("dotenv").config();
const WebSocket = require("ws");
const { Parser } = require("json2csv");

const Knex = require("../../helpers/knex_pg");
const Alpaca = require("../../helpers/alpaca");
const Finnhub = require("../../helpers/finnhub");
const moment = require("moment-timezone");
moment.tz.setDefault("America/New_York");
const fs = require("fs");
const Counter = require("./helpers/buyCandidate");

async function Run(integrationMap, users, scriptOptions) {
  const pgString = integrationMap["postgres"];
  const alpacaKeys = integrationMap["alpaca"];
  const knex = Knex(pgString);
  const alpaca = Alpaca(alpacaKeys, true); //PAPER!

  const times = [
    moment("2021-03-17T17:50:00Z").utc(),
    moment("2021-03-17T19:39:00Z").utc(),
  ];

  let seconds = times[1].diff(times[0], "s");
  const counter = new Counter(
    [{ symbol: "TAN" }],
    function (stock, quantity) {
      console.log("Buying Candidate", stock.symbol, stock.lastPrice.price);
      counter.updatePositions([
        {
          symbol: stock.symbol,
          side: "buy",
          price: stock.lastPrice.price,
          quantity: quantity,
          timestamp: moment().format("YYYY-MM-DDTHH:mm:ss"),
        },
      ]);
    },
    function (stock, position) {
      console.log(
        "Sell Candidate",
        stock.lastPrice.price,
        stock.lastPrice.price / position.price
      );
      counter.updatePositions([
        {
          symbol: position.symbol,
          side: "sell",
          price: stock.lastPrice.price,
          quantity: position.quantity,
          timestamp: moment().format("YYYY-MM-DDTHH:mm:ss"),
        },
      ]);
    }
  );

  const trades = await Alpaca.trade(
    alpacaKeys,
    "TAN",
    times[0].format("YYYY-MM-DDTHH:mm:ssZ"),
    times[1].format("YYYY-MM-DDTHH:mm:ssZ")
  );

  trades.sort((a, b) => {
    return moment(a.t).unix() - moment(b.t).unix();
  });

  const fields = Object.keys(trades[0]);
  const opts = { fields };

  try {
    const parser = new Parser(opts);
    const csv = parser.parse(trades);
    fs.writeFileSync("./data.csv", csv);
  } catch (err) {
    console.error(err);
  }

  let count = 0;
  while (count < seconds) {
    count++;
    let time2 = moment(times[0]).add(count, "seconds");
    let secondTrades = trades.filter((item) => {
      let time1 = moment(item.t).utc();
      return time1.unix() == time2.unix();
    });
    if (secondTrades.length > 0)
      counter.addTrades(
        secondTrades.map((item) => {
          return { p: item.p, t: item.t, S: "TAN", v: item.s };
        }),
        time2
      );
  }

  return true;
}

module.exports = Run;
