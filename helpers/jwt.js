var JWT = require("jwt-simple");

var Jwt = {};
Jwt.secret = Buffer.from("ae1a1981a419f3ri5377b64d14794932", "hex");

Jwt.encode = function (contact) {
  return JWT.encode(contact, Jwt.secret);
};

Jwt.decode = function (token) {
  return JWT.decode(token, Jwt.secret);
};

module.exports = Jwt;
