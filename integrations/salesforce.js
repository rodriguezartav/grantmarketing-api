var jsforce = require("jsforce");
var conn = new jsforce.Connection();

function sfConn() {
  return new Promise((resolve, reject) => {
    const fs = require("fs"),
      privateKey = fs.readFileSync("./certs/private.pem").toString("utf8"),
      jwt = require("salesforce-jwt-bearer-token-flow");
    jwt.getToken(
      {
        iss:
          "3MVG9l2zHsylwlpQiIBIjcKDbHxex2Sp5uVR2W.OarhsRhu6RKqw_ASEfsX1B_D0BAqWcKTRV7RWJlXj5AIQD",
        sub: "roberto@rodriguezlab.co",
        aud: "https://login.salesforce.com",
        privateKey: privateKey,
      },
      function (err, token) {
        if (err) return reject(err);
        var conn = new jsforce.Connection({
          instanceUrl: token.instance_url,
          accessToken: token.access_token,
        });
        resolve(conn);
      }
    );
  });
}

function insertSf(conn, obj, arr) {
  console.log("dsds1");
  if (!Array.isArray(arr)) arr = [arr];

  console.log("dsds");
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
