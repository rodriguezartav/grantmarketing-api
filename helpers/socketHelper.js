let pusher;

var Pusher = require("pusher");

const PUSHER_KEYS = process.env.PUSHER_KEYS.split(",");

pusher = new Pusher({
  appId: PUSHER_KEYS[0],
  key: PUSHER_KEYS[1],
  secret: PUSHER_KEYS[2],
  cluster: "mt1",
  useTLS: true,
});

module.exports.registerSocketServer = (server) => {};

module.exports.getPusher = () => {
  return pusher;
};
