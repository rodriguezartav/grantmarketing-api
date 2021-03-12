const request = require("superagent");
const fs = require("fs");
var parse = require("csv-parse/lib/sync");

let Marketo = {};

Marketo.post = async function (integration, url) {
  const response = await request
    .get(`${integration.application_id.replace("/rest", "")}${url}`)
    .auth(integration.auth_token, { type: "bearer" });
  return response.body.result;
};

Marketo.get = async function (integration, url) {
  const response = await request
    .get(`${integration.application_id.replace("/rest", "")}${url}`)
    .auth(integration.auth_token, { type: "bearer" });
  return response.body.result;
};

Marketo.batch = async function (type, fields, filter, integration) {
  const { exportId } = await Create(type, fields, filter, integration);
  const file = await Poll(type, integration, exportId);
  return parse(file, { columns: true });
};

module.exports = Marketo;

async function Create(type, fields, filter, integration) {
  console.log("creating slack connection");
  const response = await request
    .post(
      `${integration.application_id.replace(
        "/rest",
        ""
      )}/bulk/v1/${type}/export/create.json`
    )
    .auth(integration.auth_token, { type: "bearer" })
    .send({
      fields: fields,
      format: "CSV",
      filter: filter,
    });

  const { exportId } = response.body.result[0];
  await request
    .post(
      `${integration.application_id.replace(
        "/rest",
        ""
      )}/bulk/v1/${type}/export/${exportId}/enqueue.json`
    )
    .auth(integration.auth_token, { type: "bearer" });

  return response.body.result[0];
  /*
{
   "requestId": "e42b#14272d07d78",
   "success": true,
   "result": [
      {
         "exportId": "ce45a7a1-f19d-4ce2-882c-a3c795940a7d",
         "status": "Created",
         "createdAt": "2017-01-21T11:47:30-08:00",
         "queuedAt": "2017-01-21T11:48:30-08:00",
         "format": "CSV",
      }
   ]
}
    */
}

function Poll(type, integration, exportId) {
  function promise(resolve, reject) {
    try {
      const interval = setInterval(async () => {
        const response = await request
          .get(
            `${integration.application_id.replace(
              "/rest",
              ""
            )}/bulk/v1/${type}/export/${exportId}/status.json`
          )
          .auth(integration.auth_token, { type: "bearer" });

        if (!response.body.success) {
          clearInterval(interval);
          reject(response.body.errors[0]);
        }

        if (
          response.body.success &&
          response.body.result[0].status == "Completed"
        ) {
          clearInterval(interval);

          const file = await request
            .get(
              `${integration.application_id.replace(
                "/rest",
                ""
              )}/bulk/v1/${type}/export/${exportId}/file.json`
            )
            .auth(integration.auth_token, { type: "bearer" });

          fs.writeFileSync("./activities.csv", file.text);
          resolve(file.text);
        }
      }, 60 * 1000);
    } catch (e) {
      reject(e);
    }
  }
  return new Promise(promise);
}
