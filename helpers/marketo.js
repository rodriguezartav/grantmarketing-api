const request = require("superagent");
const fs = require("fs");
var parse = require("csv-parse/lib/sync");
const moment = require("moment");

let Marketo = {};

Marketo.request = async function (integration, originalRequest) {
  const now = moment();
  if (moment(integration.expiry_date).isBefore(now)) {
    const url = `${integration.application_id.replace(
      "/rest",
      "/identity"
    )}/oauth/token?grant_type=client_credentials&client_id=${
      integration.client_id
    }&client_secret=${integration.client_secret}`;

    const response = await request.get(url);
    integration = {
      ...integration,
      auth_token: response.body.access_token,
      refresh_token: response.body.access_token,
      external_user_id: response.body.scope,
      expiry_date: moment().add(response.body.expires_in, "seconds"),
    };
  }

  const res = await originalRequest
    .auth(integration.auth_token, { type: "bearer" })
    .retry(3);
  if (
    !res.body.success &&
    (res.body.errors[0].code == "603" || res.body.errors[0].code == "602")
  )
    return Marketo.request(
      { ...integration, expiry_date: moment().add(-1, "hour") },
      originalRequest
    );
  return res;
};

Marketo.post = async function (integration, url) {
  const response = await Marketo.request(
    integration,
    request.get(`${integration.application_id.replace("/rest", "")}${url}`)
  );

  return response.body.result;
};

Marketo.get = async function (integration, url) {
  const response = await await Marketo.request(
    integration,
    request.get(`${integration.application_id.replace("/rest", "")}${url}`)
  );
  return response.body.result ? response.body.result : response.body;
};

Marketo.getBulkActivities = async function (
  integration,
  startDate,
  activityTypeIds,
  onLoad,
  onEnd
) {
  const url = `${integration.application_id.replace("/rest", "")}`;
  let token = await Marketo.get(
    integration,
    `/rest/v1/activities/pagingtoken.json?sinceDatetime=${startDate}`
  );

  let lastResult;
  let count = 0;

  let count100 = 0;
  let start = moment();
  while (count < 2000 && (!lastResult || lastResult.body.moreResult)) {
    token = (lastResult ? lastResult.body : token).nextPageToken;

    if (count100 == 0) start = moment();

    try {
      let _lastResult = lastResult;
      lastResult = await Marketo.request(
        integration,
        request.get(
          `${url}/rest/v1/activities.json?activityTypeIds=${activityTypeIds}&nextPageToken=${token}`
        )
      );

      if (!lastResult.body.success) {
        console.log(JSON.stringify(lastResult.body));
        throw new Error(lastResult.body.errors[0]);
      }

      await onLoad(lastResult.body.result);

      if (count100 == 99) {
        let runTime = Math.abs(start.diff(moment(), "milliseconds"));
        console.lot(runTime);
        if (runTime < 20000) {
          //await sleep(20000);
        }
        count100 = 0;
      } else count100++;
      count++;
      _lastResult = null;
    } catch (e) {
      console.log(JSON.stringify(e));
      if (e.status != 606) throw e;
      else await 20000;
    }
  }

  await onEnd();
  return true;
};

Marketo.getBulk = async function (integration, url) {
  let list = [];
  let lastResult;
  let offset = 0;
  while (!lastResult || lastResult.length == 200) {
    const loopList = await Marketo.get(
      integration,
      `${url}${url.indexOf("?") > -1 ? `&` : "?"}maxReturn=200&offset=${
        list.length
      }`
    );
    list = list.concat(loopList);
    lastResult = loopList;
    offset++;
  }

  return list;
};

Marketo.batch = async function (type, fields, filter, integration) {
  const { exportId } = await Create(type, fields, filter, integration);
  const file = await Poll(type, integration, exportId);
  return parse(file, { columns: true });
};

module.exports = Marketo;

async function Create(type, fields, filter, integration) {
  console.log("creating slack connection");
  const response = await await Marketo.request(
    integration,
    request
      .post(
        `${integration.application_id.replace(
          "/rest",
          ""
        )}/bulk/v1/${type}/export/create.json`
      )

      .send({
        fields: fields,
        format: "CSV",
        filter: filter,
      })
  );

  if (!response.body.success) {
    console.log(
      `LIMIT>MARKETO>BULK>CREATE:${JSON.stringify(response.body.errors[0])}`
    );
    throw new Error(response.body.errors[0]);
  }

  const { exportId } = response.body.result[0];
  await Marketo.request(
    integration,
    request.post(
      `${integration.application_id.replace(
        "/rest",
        ""
      )}/bulk/v1/${type}/export/${exportId}/enqueue.json`
    )
  );

  return response.body.result[0];
}

function Poll(type, integration, exportId) {
  function promise(resolve, reject) {
    try {
      const interval = setInterval(async () => {
        const response = await Marketo.request(
          integration,
          request.get(
            `${integration.application_id.replace(
              "/rest",
              ""
            )}/bulk/v1/${type}/export/${exportId}/status.json`
          )
        );

        if (!response.body.success) {
          clearInterval(interval);

          console.log(
            `LIMIT>MARKETO>BULK>POLL${JSON.stringify(response.body)}`
          );

          reject(response.body.errors[0]);
        }

        if (
          response.body.success &&
          response.body.result[0].status == "Completed"
        ) {
          clearInterval(interval);

          const file = await Marketo.request(
            integration,
            request
              .get(
                `${integration.application_id.replace(
                  "/rest",
                  ""
                )}/bulk/v1/${type}/export/${exportId}/file.json`
              )
              .maxResponseSize(2000000000)
          );
          resolve(file.text);
        }
      }, 60 * 3 * 1000);
    } catch (e) {
      reject(e);
    }
  }
  return new Promise(promise);
}
function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
