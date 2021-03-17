const URL = "https://paper-api.alpaca.markets";
const request = require("superagent");
const moment = require("moment-timezone");
moment.tz.setDefault("America/New_York");

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

Alpaca.quote = async function (integration, symbol) {
  const response = await request
    .get(`https://data.alpaca.markets/v2/stocks/${symbol}/quotes`)
    .query({
      symbols: symbol,
      start: moment().add(-5, "minutes").format("YYYY-MM-DDT00:00:00Z"),
      end: moment().format("YYYY-MM-DDT00:00:00Z"),
    })
    .set("APCA-API-KEY-ID", integration.client_id)
    .set("APCA-API-SECRET-KEY", integration.client_secret);

  return response.body;
};

Alpaca.sellAtAllCost = async function (integration, symbol) {
  const response = await request
    .get(`https://data.alpaca.markets/v2/stocks/${symbol}/quotes`)
    .query({
      symbols: symbol,
      start: moment().add(-5, "minutes").format("YYYY-MM-DDT00:00:00Z"),
      end: moment().format("YYYY-MM-DDT00:00:00Z"),
    })
    .set("APCA-API-KEY-ID", integration.client_id)
    .set("APCA-API-SECRET-KEY", integration.client_secret);
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

Alpaca.marketStatus = async function (integration) {
  const response = await request
    .get(`${URL}/v2/clock`)
    .set("APCA-API-KEY-ID", integration.client_id)
    .set("APCA-API-SECRET-KEY", integration.client_secret);

  const clock = response.body;

  let close = moment(clock.next_close).utc();
  let open = moment(clock.next_open).utc();
  let now = moment().utc();
  const isAfter = open.isBefore();
  const isBefore = now.isBefore(close);

  if (isAfter && now.isBefore(close.add(-30, "minutes")))
    return { isOpen: true, isClosing: true, afterHours: true };
  else if (isAfter && clock.isOpen) {
    return { isOpen: true, afterHours: false };
  }

  if (isAfter && now.isBefore(close.add(2, "hours")))
    return { isOpen: false, afterHours: true };
  else return { isOpen: false, afterHours: false };
};

Alpaca.calendar = async function (integration) {
  const response = await request
    .get(`${URL}/v2/calendar`)
    .query({
      start: moment().format("YYYY-MM-DD"),
      end: moment().format("YYYY-MM-DD"),
    })

    .set("APCA-API-KEY-ID", integration.client_id)
    .set("APCA-API-SECRET-KEY", integration.client_secret);

  return response.body;
};

Alpaca.order = async function (integration, side, type, position, params) {
  try {
    const marketStatus = await Alpaca.marketStatus(integration);

    let order = {
      symbol: position.symbol,
      qty: parseFloat(position.qty),
      side: side,
      type: type,
      time_in_force: "day",
      order_class: "simple",
      ...params,
    };

    if (type == "limit") order.limit_price = position.price;

    const response = await request
      .post(`${URL}/v2/orders`)
      .send(order)

      .set("APCA-API-KEY-ID", integration.client_id)
      .set("APCA-API-SECRET-KEY", integration.client_secret);

    return response.body;
  } catch (e) {
    console.log(e);
    throw e;
  }
};

Alpaca.getOrders = async function (integration) {
  const response = await request
    .get(`${URL}/v2/orders`)
    .send(order)

    .set("APCA-API-KEY-ID", integration.client_id)
    .set("APCA-API-SECRET-KEY", integration.client_secret);

  return response.body;
};

module.exports = Alpaca;
