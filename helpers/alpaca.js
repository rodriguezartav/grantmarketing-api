const URL = "https://paper-api.alpaca.markets";
const request = require("superagent");
const moment = require("moment-timezone");
moment.tz.setDefault("America/New_York");
var WebSocketClient = require("websocket").client;

const alpaca = require("@alpacahq/alpaca-trade-api");

function Alpaca(integration, paper = false) {
  return new alpaca({
    feed: "sip",
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
  const start = moment().add(-5, "minutes").format("YYYY-MM-DDTHH:mm:ssZ");

  const quote = await request
    .get(`https://data.alpaca.markets/v2/stocks/${symbol}/quotes`)
    .query({
      start: start,
      end: moment().format("YYYY-MM-DDTHH:mm:ssZ"),
    })
    .retry(3)
    .set("APCA-API-KEY-ID", integration.client_id)
    .set("APCA-API-SECRET-KEY", integration.client_secret);
  return {
    quotes: quote.body.quotes,
    last: quote.body.quotes[quote.body.quotes.length - 1],
  };
};

Alpaca.getPositions = async function (integration) {
  const positions = await request
    .get(`${URL}/v2/positions`)

    .retry(3)
    .set("APCA-API-KEY-ID", integration.client_id)
    .set("APCA-API-SECRET-KEY", integration.client_secret);
  return positions.body;
};

Alpaca.trade = async function (
  integration,
  symbol,
  start,
  end,
  trades = [],
  next_page_token
) {
  let query = {
    limit: 5000,
    start: start || moment().add(-15, "minutes").format("YYYY-MM-DDTHH:mm:ssZ"),
    end: end || moment().format("YYYY-MM-DDTHH:mm:ssZ"),
  };
  if (next_page_token) query.page_token = next_page_token;
  const trade = await request
    .get(`https://data.alpaca.markets/v2/stocks/${symbol}/trades`)
    .query(query)
    .retry(3)

    .set("APCA-API-KEY-ID", integration.client_id)
    .set("APCA-API-SECRET-KEY", integration.client_secret);

  let newTrades = trade.body.trades;
  if (trade.body.next_page_token) {
    return Alpaca.trade(
      integration,
      symbol,
      start,
      end,
      trades.concat(newTrades),
      trade.body.next_page_token
    );
  }

  return trades.concat(newTrades);
};

Alpaca._getBars = async function (integration, symbol, groupBy, daysAgo) {
  try {
    const response = await request
      .get(`https://data.alpaca.markets/v1/bars/${groupBy}`)
      .query({
        symbols: symbol,
        after: moment().add(daysAgo, "days").format("YYYY-MM-DDTHH:mm:ssZ"),
        limit: 1000,
      })
      .retry(3)
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

  const calendarResponse = await request
    .get(`${URL}/v2/calendar`)
    .query({ start: moment().toISOString(), end: moment().toISOString() })
    .set("APCA-API-KEY-ID", integration.client_id)
    .set("APCA-API-SECRET-KEY", integration.client_secret);

  const clock = response.body;

  let close = moment(
    calendarResponse.body[0].date +
      "T" +
      calendarResponse.body[0].close +
      ":00-04:00"
  );

  let open = moment(
    calendarResponse.body[0].date +
      "T" +
      calendarResponse.body[0].open +
      ":00-04:00"
  );

  let now = moment(clock.timestamp);
  let todayAfterClose = moment(close).add(2, "hours");
  let todayBeforeOpen = moment(open).add(-30, "minutes");

  const isAfter = now.isBetween(close, todayAfterClose);
  const isBefore = now.isBetween(todayBeforeOpen, open);

  if (clock.is_open) return { isOpen: true, afterHours: false };
  else if (isBefore) return { isOpen: true, afterHours: true };
  else if (isAfter) {
    return { isOpen: true, afterHours: true };
  } else return { isOpen: false, afterHours: false };
};

Alpaca.calendar = async function (integration) {
  const response = await request
    .get(`${URL}/v2/calendar`)
    .query({
      start: moment().format("YYYY-MM-DD"),
      end: moment().format("YYYY-MM-DD"),
    })
    .retry(3)
    .set("APCA-API-KEY-ID", integration.client_id)
    .set("APCA-API-SECRET-KEY", integration.client_secret);

  return response.body;
};

Alpaca.order = async function (integration, side, type, position, params) {
  try {
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
      .retry(3)
      .set("APCA-API-KEY-ID", integration.client_id)
      .set("APCA-API-SECRET-KEY", integration.client_secret);

    return response.body;
  } catch (e) {
    console.log(e.text);
    throw e;
  }
};

Alpaca.getOrders = async function (integration) {
  const response = await request
    .get(`${URL}/v2/orders`)
    .retry(3)
    .set("APCA-API-KEY-ID", integration.client_id)
    .set("APCA-API-SECRET-KEY", integration.client_secret);

  return response.body;
};

Alpaca.getFilledOrder = async function (integration, order, count = -1) {
  count = count + 1;
  const response = await request
    .get(`${URL}/v2/orders/${order.id}`)
    .retry(3)
    .set("APCA-API-KEY-ID", integration.client_id)
    .set("APCA-API-SECRET-KEY", integration.client_secret);

  if (count > 10) {
    console.log("Cancelling Order", order.client_order_id);
    await Alpaca.cancelOrder(integration, order.id);
    return null;
  }
  if (response.body.status == "filled") return response.body;
  else if (response.body.status == "canceled") return null;
  else {
    await sleep(5000);
    await Alpaca.getFilledOrder(integration, order, count);
  }

  return response.body;
};

Alpaca.cancelAll = async function (integration) {
  const response = await request
    .del(`${URL}/v2/orders`)
    .retry(3)
    .set("APCA-API-KEY-ID", integration.client_id)
    .set("APCA-API-SECRET-KEY", integration.client_secret);

  return response.body;
};

Alpaca.cancelOrder = async function (integration, orderId) {
  const response = await request
    .del(`${URL}/v2/orders/${orderId}`)
    .set("APCA-API-KEY-ID", integration.client_id)
    .set("APCA-API-SECRET-KEY", integration.client_secret)
    .retry(3);

  return response.body;
};

Alpaca.sellOrDie = async function (integration, position) {
  try {
    const marketStatus = await Alpaca.marketStatus(integration);
    const client_order_id = `${position.symbol}-${moment().unix()}-${parseInt(
      Math.random() * 100
    )}`;
    //const quote = await Alpaca.quote(integration, position.symbol);

    let order = {};

    order = await Alpaca.order(
      integration,
      "sell",
      "limit",
      {
        ...position,

        order,
      },
      {
        client_order_id: client_order_id,
        extended_hours: marketStatus.afterHours,
        time_in_force: marketStatus.afterHours ? "day" : "gtc",
      }
    );

    const filledOrder = await Alpaca.getFilledOrder(integration, order);
    if (!filledOrder) {
      delete position.price;
      await Alpaca.order(
        integration,
        "sell",
        "market",
        {
          ...position,
          order,
        },
        {
          client_order_id: `${position.symbol}-${moment().unix()}-${parseInt(
            Math.random() * 100
          )}`,
          extended_hours: marketStatus.afterHours,
          time_in_force: marketStatus.afterHours ? "day" : "gtc",
        }
      );
    }
  } catch (e) {
    throw e;
  }
};

Alpaca.buyOrCry = async function (integration, position, onCry) {
  try {
    const marketStatus = await Alpaca.marketStatus(integration);

    const client_order_id = `${position.symbol}-${moment().unix()}-${parseInt(
      Math.random() * 100
    )}`;
    //const quote = await Alpaca.quote(integration, position.symbol);

    let order = {};

    order = await Alpaca.order(
      integration,
      "buy",
      "limit",
      {
        ...position,
        order,
      },
      {
        client_order_id: client_order_id,
        extended_hours: marketStatus.afterHours,
        time_in_force: marketStatus.afterHours ? "day" : "gtc",
      }
    );

    const filledOrder = await Alpaca.getFilledOrder(integration, order);
    if (!filledOrder) return onCry();
  } catch (e) {
    throw e;
  }
};

module.exports = Alpaca;

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
