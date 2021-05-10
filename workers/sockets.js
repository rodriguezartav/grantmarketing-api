const WebSocket = require("ws");

const url = 'wss://beta-ws.kraken.com';
const connection = new WebSocket(url);

const getKnex = require("../helpers/knex");
 const Integration = require("../helpers/integrationMap");

const Rds = require("../helpers/rds");

(async function run(){

const itegration = Integration(getKnex(),11)

const customerknex = new Rds("alpaca");
customerknex.registerTable("")

const knex = customerKnex(integration);
connection.onopen = () => {
    connection.send('{"event":"subscribe", "subscription":{"name":"ticker"}, "pair":["ETH/USD"]}')
  }
  
  connection.onerror = error => {
    console.log(error)
  }

  connection.onmessage = e => {
    console.log( JSON.parse(e.data)[1])
  }
})()