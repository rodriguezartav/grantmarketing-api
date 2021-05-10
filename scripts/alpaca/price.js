if (!process.env.NODE_ENV) require("dotenv").config();

const Knex = require("../../helpers/knex_pg");
const Kraken = require("../../helpers/kraken");
const finnhub = require("../../helpers/finnhub");
const moment = require("moment");
const position = require("@alpacahq/alpaca-trade-api/lib/resources/position");
const sms = require("../../helpers/sms");
var timeseries = require("timeseries-analysis");
const percentage = require('calculate-percentages')


const {
  QueryInstance,
} = require("twilio/lib/rest/autopilot/v1/assistant/query");
const { quote } = require("../../helpers/alpaca");

async function Run(integrationMap, users, scriptOptions) {
  const pgString = integrationMap["postgres"];

  const knex = Knex(pgString);
  const kraken = Kraken(integrationMap["kraken"]);
const fs = require("fs");
  const balance = await kraken.api("OHLC", { pair: "ETHUSD", interval: 5 });
  console.log(balance);



  const keys = Object.keys(balance.result);
  for (let index = 0; index < keys.length; index++) {
    const key = keys[index];

    if(key == "last") return false;

    fs.writeFileSync("./eth.json",JSON.stringify(balance.result[key]));

    const nameKey = key.replace("X","").replace("ZUSD","");
    const last =balance.result[key][balance.result[key].length-1];
    const time = last[0];
    const high = last[2];
    const close = last[4];
    const low = last[3];
    const vol = last[6];

    const diff = function(a,b){
      const diff1 = percentage.absoluteDifferenceBetween(a,b);
      return parseInt(diff1*10)/10;
    }

    var t = new timeseries.main( balance.result[key].splice(-100).map(item=> [item[0], parseFloat(item[4]) ] ));
    var tvol = new timeseries.main( balance.result[key].splice(-100).map(item=> [item[0], parseFloat(item[6]) ] ));


    

    await sms(`${nameKey}: ${close} -${diff(low,close)}% +${diff(high,close)}% ${t.min()} ${t.max()} ` , "whatsapp:+50684191862");

    await sms(`Price` , "whatsapp:+50684191862",[t.ma({period: 14}).chart({main:true}), tvol.ma({period: 14}).chart({main:true}) ]   );


    

    
  }


  return true;
}

module.exports = Run;
