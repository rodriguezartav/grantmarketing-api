if (!process.env.NODE_ENV) require("dotenv").config();

var WebSocketClient = require("websocket").client;

const Knex = require("../../helpers/knex_pg");
const Alpaca = require("../../helpers/alpaca");
const BuyCandidate = require("./helpers/buyCandidate");
const Positions = require("./helpers/positions");

const moment = require("moment-timezone");
moment.tz.setDefault("America/New_York");

async function Run(integrationMap, users, scriptOptions) {
  const pgString = integrationMap["postgres"];
  const alpacaKeys = integrationMap["alpaca"];
  const knex = Knex(pgString);
  const alpaca = Alpaca(alpacaKeys, true);
  var sip = new WebSocketClient();

  const market = await Alpaca.marketStatus(alpacaKeys);
  console.log(market);

  async function onBuy(stock, quantity) {
    console.log("Buying Candidate", stock.symbol, stock.lastPrice.price);

    try {
      await Alpaca.buyOrCry(
        alpacaKeys,
        {
          symbol: stock.symbol,
          side: "buy",
          price: stock.lastPrice.price,
          qty: quantity,
          timestamp: moment().format("YYYY-MM-DDTHH:mm:ss"),
        },
        function onCry() {
          counter.updatePositions([
            {
              pending: "sell",
              symbol: stock.symbol,
            },
          ]);
        }
      );
      counter.updatePositions([
        {
          pending: "buy",
          symbol: stock.symbol,
        },
      ]);
    } catch (e) {
      console.log(e);
    }
  }

  async function onSell(stock, position) {
    console.log(
      "Sell Candidate",
      stock.lastPrice.price,
      stock.lastPrice.price / position.price
    );

    try {
      await Alpaca.sellOrDie(alpacaKeys, {
        symbol: stock.symbol,
        side: "sell",
        price: stock.lastPrice.price,
        qty: position.quantity,
      });
    } catch (e) {
      console.log(e);
    }

    counter.updatePositions([
      {
        symbol: position.symbol,
        pending: "sell",
      },
    ]);
  }

  let counter = new BuyCandidate(onBuy, onSell);

  let stocks = [];
  let positions = [];
  let sipConnection;
  let sipReady = false;

  positions = await Alpaca.getPositions(alpacaKeys);
  stocks = await knex.table("stocks").select();
  counter.updatePositions(positions);
  counter.updateStocks(stocks);

  setInterval(async () => {
    positions = await Alpaca.getPositions(alpacaKeys);
    counter.updatePositions(positions);

    stocks = await knex.table("stocks").select();
    counter.updateStocks(stocks);
  }, 1500);

  setInterval(async () => {
    sipConnection.sendUTF(
      JSON.stringify({
        action: "subscribe",
        trades: Array.from(
          new Set(
            stocks
              .map((item) => item.symbol)
              .concat(positions.map((item) => item.symbol))
          )
        ),
      })
    );
  }, 120500);

  sip.on("connect", function (connection) {
    sipConnection = connection;

    connection.on("error", function (error) {
      console.log("NOTIFY", "Connection Error: " + error.toString());
    });
    connection.on("close", function () {
      sip.connect("wss://stream.data.alpaca.markets/v2/sip");
      console.log("NOTIFY", "echo-protocol Connection Closed");
    });

    connection.on("message", async function incoming(data) {
      data = JSON.parse(data.utf8Data);

      if (data[0].msg == "connected") {
        connection.sendUTF(
          JSON.stringify({
            action: "auth",
            key: alpacaKeys.client_id,
            secret: alpacaKeys.client_secret,
          })
        );
      } else if (data[0].msg == "authenticated") {
        sipReady = true;
        connection.sendUTF(
          JSON.stringify({
            action: "subscribe",
            trades: Array.from(
              new Set(
                stocks
                  .map((item) => item.symbol)
                  .concat(positions.map((item) => item.symbol))
              )
            ),
          })
        );
      } else {
        const newTrades = data.filter((item) => item.T == "t");
        if (newTrades.length > 0) counter.addTrades(newTrades);
        //else console.log(data);
      }
    });
  });

  sip.connect("wss://stream.data.alpaca.markets/v2/sip");

  return true;
}

module.exports = Run;
