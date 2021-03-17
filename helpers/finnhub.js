const URL = "https://api.alpaca.markets";
const request = require("superagent");
const moment = require("moment");

function Finnhub(integration) {}

Finnhub.pattern = async function (integration, symbol, groupBy = "5") {
  const response = await request.get(
    `https://finnhub.io/api/v1/scan/pattern?symbol=${symbol}&resolution=${groupBy}&token=${integration.api_key}`
  );

  return response.body;
};

Finnhub.techIndicators = async function (integration, symbol, groupBy = "5") {
  try {
    return {
      rsi: await Finnhub.rsi(integration, [symbol], groupBy),
      macd: await Finnhub.macd(integration, [symbol], groupBy),
      roc: await Finnhub.roc(integration, [symbol], groupBy),
    };
  } catch (e) {
    console.log(e);
    throw e;
  }
};

Finnhub.indicators = async function (integration, symbols, groupBy = "5") {
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
        .unix()}&to=${moment().unix()}&indicator=rsi&timeperiod=3&token=${
        integration.api_key
      }`
    );
    symbolsWithBars[symbol] = response.body;
  }
  return symbolsWithBars;
};

Finnhub.macd = async function (integration, symbols, groupBy = "D") {
  let symbolsWithBars = {};

  for (let index = 0; index < symbols.length; index++) {
    const symbol = symbols[index];
    const response = await request.get(
      `https://finnhub.io/api/v1/indicator?symbol=${symbol}&resolution=${groupBy}&from=${moment()
        .add(-40, "days")
        .unix()}&to=${moment().unix()}&indicator=macd&token=${
        integration.api_key
      }`
    );
    symbolsWithBars[symbol] = response.body;
  }
  return symbolsWithBars;
};

Finnhub.roc = async function (integration, symbols, groupBy = "D") {
  let symbolsWithBars = {};

  for (let index = 0; index < symbols.length; index++) {
    const symbol = symbols[index];
    const response = await request.get(
      `https://finnhub.io/api/v1/indicator?symbol=${symbol}&resolution=${groupBy}&from=${moment()
        .add(-29, "days")
        .unix()}&to=${moment().unix()}&indicator=roc&token=${
        integration.api_key
      }`
    );
    symbolsWithBars[symbol] = response.body;
  }
  return symbolsWithBars;
};

module.exports = Finnhub;
