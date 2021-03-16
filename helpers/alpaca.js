const URL = "https://api.alpaca.markets";
const request = require("superagent");
const moment = require("moment");

const alpaca = require("@alpacahq/alpaca-trade-api");

function Alpaca(integration, paper = false) {
  return new alpaca({
    keyId: integration.client_id,
    secretKey: integration.client_secret,
    paper: paper,
  });
}

Alpaca.getBars = async function (
  integration,
  symbols,
  groupBy = "1Min",
  daysAgo = -2
) {
  let symbolsWithBars = [];

  for (let index = 0; index < symbols.length; index++) {
    const symbol = symbols[index];
    const bars = await Alpaca._getBars(integration, symbol, groupBy, daysAgo);
    symbolsWithBars.push({ symbol, bars });
  }
  return symbolsWithBars;
};

Alpaca._getBars = async function (integration, symbol, groupBy, daysAgo) {
  try {
    const response = await request
      .get(`https://data.alpaca.markets/v1/bars/${groupBy}`)
      .query({
        symbols: symbol,
        after: moment().add(daysAgo, "days").format("YYYY-MM-DDT00:00:00Z"),
        limit: 1000,
      })
      .set("APCA-API-KEY-ID", integration.client_id)
      .set("APCA-API-SECRET-KEY", integration.client_secret);

    return response.body[symbol];
  } catch (e) {
    console.log(e);
  }
};

Alpaca.clock = async function (integration) {
  const response = await request
    .get(`https://data.alpaca.markets//v2/clock`)

    .set("APCA-API-KEY-ID", integration.client_id)
    .set("APCA-API-SECRET-KEY", integration.client_secret);

  return response.body;
};

Alpaca.calendar = async function (integration) {
  const response = await request
    .get(`https://data.alpaca.markets/v2/calendar`)
    .query({
      start: moment().format("YYYY-MM-DD"),
      end: moment().format("YYYY-MM-DD"),
    })

    .set("APCA-API-KEY-ID", integration.client_id)
    .set("APCA-API-SECRET-KEY", integration.client_secret);

  return response.body;
};

module.exports = Alpaca;
