module.exports = function (body, res) {
  const { callback_id, type, trigger_id, message, blocks } = body;

  res.send({
    options: [
      {
        text: {
          type: "plain_text",
          text: "*this is plain_text text*",
        },
        value: "value-0",
      },
      {
        text: {
          type: "plain_text",
          text: "*this is plain_text text*",
        },
        value: "value-1",
      },
      {
        text: {
          type: "plain_text",
          text: "*this is plain_text text*",
        },
        value: "value-2",
      },
    ],
  });
};
