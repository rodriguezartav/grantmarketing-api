var jsforce = require("jsforce");
const { parse } = require("json2csv");
const request = require("superagent");
var lowercaseObjectKeys = require("lowercase-object-keys");
const CSV = require("csvtojson");

async function sfConn(integration) {
  console.log("creating salesforce connection");
  return new jsforce.Connection({
    instanceUrl: integration.application_id,
    accessToken: integration.auth_token,
  });
}

async function insertContact(conn, contact, insertCompany) {
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

  if (contact._companyname) {
    accounts = await query(
      conn,
      `select id from Account where name LIKE '%${contact._companyname}%'`
    );
    if (accounts[0]) contact.accountId = accounts[0].id;
    else {
      const account = await insert(conn, "Account", {
        name: contact._companyname,
      });
      contact.accountId = account.id;
    }
    delete contact._companyname;
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
    return update(conn, "Contact", { ...contact, Id: contacts[0].id });
  } else return insert(conn, "Contact", contact);
}

async function bulk(conn, objectName, operation, externalIdFieldName, arr) {
  if (arr.length == 0)
    return {
      success: true,
      items: [],
      errors: [],
    };

  const csv = parse(arr, { fields: Object.keys(arr[0]) });

  const job = await request
    .post(`${conn.instanceUrl}/services/data/v51.0/jobs/ingest/`)
    .send({
      object: objectName,
      contentType: "CSV",
      externalIdFieldName: externalIdFieldName,
      operation: operation,
    })
    .auth(conn.accessToken, { type: "bearer" });

  await request
    .put(`${conn.instanceUrl}/${job.body.contentUrl}`)
    .accept("application/json")
    .type("text/csv")
    .send(csv)
    .auth(conn.accessToken, { type: "bearer" });

  await request
    .patch(
      `${conn.instanceUrl}/services/data/v51.0/jobs/ingest/${job.body.id}/`
    )
    .send({
      state: "UploadComplete",
    })
    .auth(conn.accessToken, { type: "bearer" });

  let jobResult;
  while (
    !jobResult ||
    (jobResult.body.state != "JobComplete" && jobResult.body.state != "Failed")
  ) {
    jobResult = await request
      .get(
        `${conn.instanceUrl}/services/data/v51.0/jobs/ingest/${job.body.id}/`
      )

      .auth(conn.accessToken, { type: "bearer" });
    if (
      jobResult.body.state != "JobComplete" &&
      jobResult.body.state != "Failed"
    )
      await sleep(1000 * 60 * 3);
  }
  const successResults = await request
    .get(
      `${conn.instanceUrl}/services/data/v51.0/jobs/ingest/${job.body.id}/successfulResults`
    )

    .auth(conn.accessToken, { type: "bearer" });

  const failedResults = await request
    .get(
      `${conn.instanceUrl}/services/data/v51.0/jobs/ingest/${job.body.id}/failedResults`
    )

    .auth(conn.accessToken, { type: "bearer" });

  let results = await CSV().fromString(successResults.text);

  const errors = await CSV().fromString(failedResults.text);

  let allOk = true;
  const errorResults = errors
    .filter((item) => item)
    .map((item) => {
      console.log(item);
      allOk = false;
      return {
        id: item.sf__Id,
        error: item.sf__Error,
        [externalIdFieldName]: item[externalIdFieldName],
      };
    });

  results = results.map((item) => {
    const result = { id: item.sf__Id };
    if (externalIdFieldName)
      results[externalIdFieldName] = item[externalIdFieldName];
    return result;
  });

  return {
    success: allOk,
    items: results,
    errors: errorResults,
  };
}

function query(conn, queryString) {
  return new Promise((resolve, reject) => {
    var records = [];
    var query = conn
      .query(queryString)
      .on("record", function (record) {
        Object.keys(record).forEach((key) => {
          if (key.indexOf("__r") > -1) {
            record[key] = lowercaseObjectKeys(record[key]);
          }
        });
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
        lowercaseObjectKeys({ ...lowercaseObjectKeys(obj), id: ret.id })
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

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
