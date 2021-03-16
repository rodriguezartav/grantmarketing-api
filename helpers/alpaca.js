const URL = "https://api.alpaca.markets";
const request = require("superagent");
const moment = require("moment");

function Alpaca(integration) {}

Alpaca.getBars = async function (integration, symbols) {
  let symbolsWithBars = [];

  for (let index = 0; index < symbols.length; index++) {
    const symbol = symbols[index];
    const bars = await Alpaca._getBars(integration, symbol);
    symbolsWithBars.push({ symbol, bars });
  }
  return symbolsWithBars;
};

Alpaca._getBars = async function (integration, symbol) {
  try {
    const response = await request
      .get(`https://data.alpaca.markets/v1/bars/5Min`)
      .query({
        symbols: symbol,
        after: moment().add(-2, "days").format("YYYY-MM-DDT00:00:00Z"),
        limit: 1000,
      })

      .set("APCA-API-KEY-ID", integration.client_id)
      .set("APCA-API-SECRET-KEY", integration.client_secret);

    return response.body[symbol];
  } catch (e) {
    console.log(e);
  }
};

module.exports = Alpaca;
