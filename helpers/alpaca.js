const URL = "https://api.alpaca.markets";
const request = require("superagent");
const moment = require("moment");

function Alpaca(integration) {}

Alpaca.getBars = async function (integration, symbols) {
  const bars = [];
  for (let index = 0; symbols < array.length; index++) {
    const symbol = symbols[index];
    const response = request
      .get(`${URL}/v2/stocks/${symbol}/bars`)
      .query({
        timeframe: "1Day",
        start: moment().add(-1, "days"),
        end: moment(),
      })
      .set("APCA-API-KEY-ID", integration.client_id)
      .set("APCA-API-SECRET-KEY", integration.client_secret);

    console.log(response.body);
  }
};
