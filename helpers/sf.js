var jsforce = require("jsforce");
var conn = new jsforce.Connection();
const Knex = require("../helpers/knex");

var lowercaseObjectKeys = require("lowercase-object-keys");

async function sfConn(integration) {
  console.log("creating salesforce connection");
  return new jsforce.Connection({
    instanceUrl: integration.application_id,
    accessToken: integration.auth_token,
  });
}

async function insertContact(conn, contact) {
  var key, value;
  contact = lowercaseObjectKeys(contact);

  if (contact.phone) {
    key = "phone";
    value = contact.phone;
  }

  if (contact.MobilePhone) {
    key = "mobile";
    value = contact.MobilePhone;
  }

  let contacts = [];
  let accounts = [];

  if (contact.department) {
    accounts = await query(
      conn,
      `select id from Account where name LIKE '%${contact.department}%'`
    );
    if (accounts[0]) contact.accountId = accounts[0].id;
  }
  if (!contact.email && key)
    contacts = await query(
      conn,
      `select id,name,email,MobilePhone,phone from Contact where ${key}='${value}'`
    );
  else if (contact.email && !key)
    contacts = await query(
      conn,
      `select id,name,email,MobilePhone,phone from Contact where email='${contact.email}'`
    );
  else
    contacts = await query(
      conn,
      `select id,name,email,MobilePhone,phone from Contact where email='${contact.email}' or ${key}='${value}'`
    );

  if (contacts[0]) {
    console.log("ggg", { ...contact, Id: contacts[0].id });
    return update(conn, "Contact", { ...contact, Id: contacts[0].id });
  } else return insert(conn, "Contact", contact);
}

async function bulk(conn, obj, op, extId, arr) {
  conn.bulk.pollTimeout = 40000; // Bulk timeout can be specified globally on the connection object

  var arrays = [];
  var size = 6000;

  let resultMap = {};
  while (arr.length > 0) {
    arrays.push(arr.splice(0, size));
  }

  for (let index = 0; index < arrays.length; index++) {
    const element = arrays[index];
    const map = await _bulk(conn, obj, op, extId, element);
    resultMap = { ...resultMap, map };
  }
}

function _bulk(conn, obj, op, extId, arr) {
  return new Promise((resolve, reject) => {
    conn.bulk.load(obj, op, { extIdField: extId }, arr, function (err, rets) {
      if (err) {
        return reject(err);
      }

      const map = {};
      console.log("Job Complete for " + rets.length);
      for (var i = 0; i < rets.length; i++) {
        if (rets[i].success) {
          map[arr[i].external_id__c] = rets[i].id;
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
        records.push(lowercaseObjectKeys(record));
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

function insert(conn, type, obj) {
  return new Promise((resolve, reject) => {
    conn.sobject(type).create(obj, function (err, ret) {
      if (err || !ret.success) {
        console.log(err);
        return reject(err);
      }
      return resolve(
        lowercaseObjectKeys({ ...lowercaseObjectKeys(obj), id: ret[0].id })
      );
    });
  });
}

function update(conn, type, obj) {
  return new Promise((resolve, reject) => {
    conn.sobject(type).update(obj, function (err, ret) {
      if (err || !ret.success) {
        console.log(err);
        return reject(err);
      }
      return resolve(lowercaseObjectKeys(obj));
    });
  });
}

module.exports = {
  bulk,
  insertContact,
  insert,
  update,
  query,
  sfConn,
};
