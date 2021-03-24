const moment = require("moment-timezone");
moment.tz.setDefault("America/New_York");
var change = require("percent-change");

class Counter {
  constructor(onBuyCandidate, onSellCandidate) {
    this.stocks = {};
    this.positionMap = {};
    this.priceMap = {};
    this.positionsMap = {};
    this.onBuyCandidate = onBuyCandidate;
    this.onSellCandidate = onSellCandidate;
    this.stocksMap = {};
  }

  updateStocks = function (stocks) {
    stocks.forEach((item) => {
      this.stocksMap[item.symbol] = {
        original_sell_at: item.sell_at || 0.989,
        buy_amount: item.buy_amount || 1,
        sell_at: item.sell_at || 0.989,
        lower_base_at: item.lower_base_at || 0.991,
        raise_base_at: item.raise_base_at || 1.006,
        buy_at: item.buy_at || 1.01,
        ...item,
      };

      this.priceMap[item.symbol] = {
        all: [],
        highs: [],
        lows: [],
        candidates: [],
        lastPrice: { price: 0 },
        lastHigh: null,
        basePrice: null,
        symbol: item.symbol,
      };
    });
  };

  updatePositions = function (positions) {
    positions.forEach((item) => {
      let existingPosition = this.positionMap[item.symbol];

      if (item.pending == "buy") {
        existingPosition = {
          symbol: item.symbol,
        };
      } else if (item.pending == "sell") {
        existingPosition = {
          ...existingPosition,
          quantity: 0,
        };
      } else {
        existingPosition = {
          ...existingPosition,
          price: parseFloat(item.avg_entry_price),
          time: item.timestamp,
          quantity: item.qty,
          symbol: item.symbol,
        };
      }

      if (existingPosition.quantity == 0) delete this.positionMap[item.symbol];
      else {
        this.positionMap[item.symbol] = existingPosition;
        if (!this.priceMap[item.symbol])
          this.priceMap[item.symbol] = {
            all: [],
            highs: [],
            lows: [],
            candidates: [],
            lastPrice: { price: 0 },
            lastHigh: null,
            basePrice: {
              originalPrice: existingPosition.price,
              time: moment().toISOString(),
              price: existingPosition.price,
              volume: parseFloat(existingPosition.qty),
            },
            symbol: item.symbol,
          };
      }
    });
  };

  addTrade_Start = function (item) {
    let pricesPerSymbol = this.priceMap[item.S];
    //pricesPerSymbol.all.push({ time: item.t, price: item.p, volume: item.v });

    //first price, setting things up
    if (!pricesPerSymbol.basePrice)
      pricesPerSymbol.basePrice = {
        originalPrice: item.p,
        time: item.t,
        price: item.p,
        volume: item.v,
      };

    //first price, setting things up for
    if (!pricesPerSymbol.lastHigh)
      pricesPerSymbol.lastHigh = {
        time: item.t,
        price: item.p,
        volume: item.v,
      };

    if (!pricesPerSymbol.lastLow)
      pricesPerSymbol.lastLow = {
        time: item.t,
        price: item.p,
        volume: item.v,
      };

    return pricesPerSymbol;
  };

  addTrade_AdjustSellAt = function (pricesPerSymbol, item) {
    let buyPrice;
    let profitRate;
    if (this.positionMap[pricesPerSymbol.symbol]) {
      buyPrice = this.positionMap[pricesPerSymbol.symbol].price;
      profitRate = item.p / buyPrice;
      const sellAt = this.stocksMap[pricesPerSymbol.symbol].sell_at;

      if (profitRate > 1.06 && sellAt < 0.999)
        this.stocksMap[pricesPerSymbol.symbol].sell_at = 0.998;
      else if (profitRate > 1.05 && sellAt < 0.998)
        this.stocksMap[pricesPerSymbol.symbol].sell_at = 0.998;
      else if (profitRate > 1.04 && sellAt < 0.9975)
        this.stocksMap[pricesPerSymbol.symbol].sell_at = 0.9975;
      else if (profitRate > 1.03 && sellAt < 0.997)
        this.stocksMap[pricesPerSymbol.symbol].sell_at = 0.997;
      else if (profitRate > 1.025 && sellAt < 0.996)
        this.stocksMap[pricesPerSymbol.symbol].sell_at = 0.996;
      else if (profitRate > 1.02 && sellAt < 0.995)
        this.stocksMap[pricesPerSymbol.symbol].sell_at = 0.995;
      else if (profitRate > 1.018 && sellAt < 0.994)
        this.stocksMap[pricesPerSymbol.symbol].sell_at = 0.994;
      else if (profitRate > 1.016 && sellAt < 0.993)
        this.stocksMap[pricesPerSymbol.symbol].sell_at = 0.993;
      else if (profitRate > 1.014 && sellAt < 0.992)
        this.stocksMap[pricesPerSymbol.symbol].sell_at = 0.992;
      else if (profitRate > 1.012 && sellAt < 0.991)
        this.stocksMap[pricesPerSymbol.symbol].sell_at = 0.991;
    } else {
      this.stocksMap[pricesPerSymbol.symbol].sell_at = this.stocksMap[
        pricesPerSymbol.symbol
      ].original_sell_at;
    }
    return { buyPrice, profitRate };
  };

  addTrade_AdjustHigh = function (pricesPerSymbol, item) {
    //recording new High and stats
    if (item.p > pricesPerSymbol.lastHigh.price) {
      //Get Time ration to adjust base price
      const timeFromBasePrice = moment(item.t).diff(
        moment(pricesPerSymbol.basePrice.time),
        "s"
      );
      pricesPerSymbol.lastHigh = {
        time: item.t,
        price: item.p,
        volume: item.v,
        rate_high: item.p / pricesPerSymbol.lastHigh.price,
        seconds_high: moment(item.t).diff(
          moment(pricesPerSymbol.lastHigh.time)
        ),
        rate_base: item.p / pricesPerSymbol.basePrice.price,
        seconds_base: moment(item.t).diff(
          moment(pricesPerSymbol.basePrice.time)
        ),
      };
      if (pricesPerSymbol.highs.length > 100)
        pricesPerSymbol.highs = pricesPerSymbol.highs.slice(75);
      pricesPerSymbol.highs.push(pricesPerSymbol.lastHigh);

      if (
        this.positionMap[pricesPerSymbol.symbol] &&
        pricesPerSymbol.lastHigh.price > pricesPerSymbol.basePrice.originalPrice
      ) {
        let adjustedLowPrice =
          ((pricesPerSymbol.lastHigh.price -
            pricesPerSymbol.basePrice.originalPrice) *
            timeFromBasePrice) /
          800;

        pricesPerSymbol.basePrice.price =
          pricesPerSymbol.basePrice.originalPrice + adjustedLowPrice;
      }
    }

    return pricesPerSymbol;
  };

  addTrade_AdjustLow = function (pricesPerSymbol, item) {
    if (item.p < pricesPerSymbol.lastLow.price) {
      //Get Time ration to adjust base price
      const timeFromBasePrice = moment(item.t).diff(
        moment(pricesPerSymbol.basePrice.time),
        "s"
      );
      pricesPerSymbol.lastLow = {
        time: item.t,
        price: item.p,
        volume: item.v,
        rate_low: item.p / pricesPerSymbol.lastLow.price,
        seconds_low: moment(item.t).diff(
          moment(pricesPerSymbol.lastLow.time),
          "s"
        ),
        rate_base: item.p / pricesPerSymbol.basePrice.price,
        seconds_base: moment(item.t).diff(
          moment(pricesPerSymbol.basePrice.time),
          "s"
        ),
      };
      if (pricesPerSymbol.lows.length > 100)
        pricesPerSymbol.lows = pricesPerSymbol.lows.slice();
      pricesPerSymbol.lows.push(pricesPerSymbol.lastLow);

      if (
        !this.positionMap[pricesPerSymbol.symbol] &&
        pricesPerSymbol.lastLow.price < pricesPerSymbol.basePrice.price
      ) {
        let adjustedLowPrice =
          ((pricesPerSymbol.basePrice.price - pricesPerSymbol.lastLow.price) *
            timeFromBasePrice) /
          1000;
        if (
          adjustedLowPrice >
          pricesPerSymbol.basePrice.price - pricesPerSymbol.lastLow.price
        )
          adjustedLowPrice =
            pricesPerSymbol.basePrice.price - pricesPerSymbol.lastLow.price;

        pricesPerSymbol.basePrice.price =
          pricesPerSymbol.basePrice.originalPrice - adjustedLowPrice;
      }
    }
    return pricesPerSymbol;
  };

  addTrade_LastPrice = function (pricesPerSymbol, item) {
    // recording last price and stats
    pricesPerSymbol.lastPrice = {
      time: item.t,
      price: item.p,
      volume: item.v,
      rate_high: item.p / pricesPerSymbol.lastHigh.price,
      rate_low: item.p / pricesPerSymbol.lastLow.price,
      seconds_high: moment(item.t).diff(
        moment(pricesPerSymbol.lastHigh.time),
        "s"
      ),
      seconds_low: moment(item.t).diff(
        moment(pricesPerSymbol.lastLow.time),
        "s"
      ),
      seconds_base: moment(item.t).diff(
        moment(pricesPerSymbol.basePrice.time),
        "s"
      ),
      rate_base: item.p / pricesPerSymbol.basePrice.price,
      rate_original: item.p / pricesPerSymbol.basePrice.originalPrice,
    };
    return pricesPerSymbol;
  };

  addTrade_Sell = function (pricesPerSymbol, item) {
    if (
      this.positionMap[pricesPerSymbol.symbol] &&
      this.positionMap[pricesPerSymbol.symbol].price
    ) {
      if (
        pricesPerSymbol.lastPrice.rate_base <=
        this.stocksMap[pricesPerSymbol.symbol].sell_at
      ) {
        this.onSellCandidate(
          pricesPerSymbol,
          this.positionMap[pricesPerSymbol.symbol]
        );

        return true;
      }
    }
    return false;
  };

  addTrade_Buy = function (pricesPerSymbol, item) {
    if (
      !this.positionMap[pricesPerSymbol.symbol] &&
      pricesPerSymbol.lastPrice.rate_base >
        this.stocksMap[pricesPerSymbol.symbol].buy_at
    ) {
      this.onBuyCandidate(
        pricesPerSymbol,
        this.stocksMap[pricesPerSymbol.symbol].buy_amount
      );
      return true;
    }
    return false;
  };

  addTrade_RaiseBar = function (pricesPerSymbol, item) {
    if (
      this.positionMap[pricesPerSymbol.symbol] &&
      pricesPerSymbol.lastPrice.rate_original >
        this.stocksMap[pricesPerSymbol.symbol].raise_base_at
    ) {
      return true;
    }

    return false;
  };

  addTrade_LowerBar = function (pricesPerSymbol, item) {
    if (
      !this.positionMap[pricesPerSymbol.symbol] &&
      pricesPerSymbol.lastPrice.rate_original <=
        this.stocksMap[pricesPerSymbol.symbol].lower_base_at
    ) {
      return true;
    }
    return false;
  };

  addTrades = function (trades) {
    trades.forEach((item) => {
      if (!this.priceMap[item.S]) {
        return false;
      }

      let pricesPerSymbol = this.addTrade_Start(item);

      this.addTrade_AdjustSellAt(pricesPerSymbol, item);

      pricesPerSymbol = this.addTrade_AdjustHigh(pricesPerSymbol, item);
      pricesPerSymbol = this.addTrade_AdjustLow(pricesPerSymbol, item);

      pricesPerSymbol = this.addTrade_LastPrice(pricesPerSymbol, item);

      let sellResult, lowerBarResult, buyResult, raiseBarResult;

      sellResult = this.addTrade_Sell(pricesPerSymbol, item);

      lowerBarResult =
        !sellResult && this.addTrade_LowerBar(pricesPerSymbol, item);

      buyResult = this.addTrade_Buy(pricesPerSymbol, item);

      raiseBarResult =
        !buyResult && this.addTrade_RaiseBar(pricesPerSymbol, item);

      if (sellResult || lowerBarResult || buyResult || raiseBarResult) {
        const last = pricesPerSymbol.basePrice.price;
        pricesPerSymbol.basePrice = {
          time: item.t,
          originalPrice: item.p,
          price: item.p,
          volume: item.v,
        };

        console.log(
          "Adjusting base from",
          pricesPerSymbol.symbol,
          last,
          "to",
          pricesPerSymbol.basePrice.price
        );
        pricesPerSymbol.highs = [pricesPerSymbol.basePrice];
        pricesPerSymbol.lastHigh = pricesPerSymbol.basePrice;
        pricesPerSymbol.lows = [pricesPerSymbol.basePrice];
        pricesPerSymbol.lastLow = pricesPerSymbol.basePrice;
      }
      this.priceMap[item.S] = pricesPerSymbol;
    });
  };
}

module.exports = Counter;
