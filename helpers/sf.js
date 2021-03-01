var jsforce = require("jsforce");
var conn = new jsforce.Connection();
const Knex = require("../helpers/knex");

async function sfConn(integration) {
  console.log("creating salesforce connection");
  return new jsforce.Connection({
    instanceUrl: integration.application_id,
    accessToken: integration.auth_token,
  });
}

function insertSf(conn, obj, arr) {
  if (!Array.isArray(arr)) arr = [arr];

  return new Promise((resolve, reject) => {
    conn.sobject(obj).create(arr, function (err, ret) {
      console.log(err, ret);
      if (err || !ret.success) reject(err);
      else if (arr.length == 1) resolve(ret.id);
      else resolve(ret);
    });
  });
}

function bulk(conn, obj, op, extId, arr) {
  conn.bulk.pollTimeout = 25000; // Bulk timeout can be specified globally on the connection object
  return new Promise((resolve, reject) => {
    conn.bulk.load(obj, op, { extIdField: extId }, arr, function (err, rets) {
      if (err) {
        return reject(err);
      }

      const map = {};

      for (var i = 0; i < rets.length; i++) {
        if (rets[i].success) {
          map[arr[i].external_id__c] = rets[i].id;
          console.log(
            "#" + (i + 1) + " loaded successfully, id = " + rets[i].id
          );
        } else {
          console.log(
            "#" +
              (i + 1) +
              obj +
              " error occurred, message = " +
              rets[i].errors.join(", ")
          );
          console.log(arr[i]);
        }
      }
      resolve(map);
    });
  });
}

function query(conn, queryString) {
  return new Promise((resolve, reject) => {
    var records = [];
    var query = conn
      .query(queryString)
      .on("record", function (record) {
        records.push(record);
      })
      .on("end", function () {
        console.log("total in database : " + query.totalSize);
        console.log("total fetched : " + query.totalFetched);
        resolve(records);
      })
      .on("error", function (err) {
        console.error(err);
        reject(err);
      })
      .run({ autoFetch: true, limit: 100000 });
  });
}

module.exports = {
  bulk,
  insertSf,
  query,
  sfConn,
};
