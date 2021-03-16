const URL = "https://api.alpaca.markets";
const request = require("superagent");
const moment = require("moment");

function Finnhub(integration) {}

Finnhub.indicators = async function (integration, symbols, groupBy = "D") {
  let symbolsWithBars = {};

  for (let index = 0; index < symbols.length; index++) {
    const symbol = symbols[index];
    const response = await request.get(
      `https://finnhub.io/api/v1/scan/technical-indicator?symbol=${symbol}&resolution=${groupBy}&token=${integration.api_key}`
    );
    symbolsWithBars[symbol] = response.body;
  }
  return symbolsWithBars;
};

Finnhub.rsi = async function (integration, symbols, groupBy = "D") {
  let symbolsWithBars = {};

  for (let index = 0; index < symbols.length; index++) {
    const symbol = symbols[index];
    const response = await request.get(
      `https://finnhub.io/api/v1/indicator?symbol=${symbol}&resolution=${groupBy}&from=${moment()
        .add(-15, "days")
        .unix()}&to=${moment().unix()}&indicator=RSI&timeperiod=3&token=${
        integration.api_key
      }`
    );
    symbolsWithBars[symbol] = response.body;
  }
  return symbolsWithBars;
};

module.exports = Finnhub;
