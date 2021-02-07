const configuration = {
  ivr: {
    text:
      "Thanks for calling. You can press a key or say the department name. Press 1 for Sales, press 2 for Support",
    options: [
      {
        friendlyName: "Sales",
        digit: 1,
        id: "sales",
      },
      {
        friendlyName: "Support",
        digit: 2,
        id: "support",
      },
    ],
  },
  queues: [
    {
      friendlyName: "Chat Queue",
      filterFriendlyName: "Chat",
      id: "chat",
      taskQueueSid: "",
      expression: 'channel == "chat"',
      targetWorkerExpression: "",
    },
    {
      friendlyName: "Phone Queue",
      filterFriendlyName: "Phone",
      id: "phone",
      taskQueueSid: "",
      expression: 'channel == "phone"',
      targetWorkerExpression:
        "task.team == worker.team OR task.transferToWorkerSid = worker.sid",
    },
    {
      friendlyName: "Video Queue",
      filterFriendlyName: "Video",
      id: "video",
      taskQueueSid: "",
      expression: 'channel == "video"',
      targetWorkerExpression: "",
    },
  ],
  twilio: {
    workerOfflineActivitySid: "WAffdf462cc8dcc0a22ac902f802867de8",
    workerAvailableActivitySid: "WA37bf858e14b122cec5f32ee1596c4614",
    workerUnavailableActivitySid: "WA1a4b61efd44b7076e0f488408b804778",
    callerId: "+50641007650",
    applicationSid: "APb0fc7269370b83ad9163880779741224",
    workflowSid: "WW47af40bf222e735a57659ba3f7c6e87e",
    facebookPageId: null,
  },
};

var TwilioMiddleware = function (req, res, next) {
  req.twilio = {
    configuration: configuration,
  };

  next();
};

module.exports = TwilioMiddleware;
