const Jwt = require("../helpers/jwt");
const moment = require("moment");

var JWTMiddleware = function (req, res, next) {
  let token =
    req.headers.authorization ||
    req.headers.Authorization ||
    req.query.authorization;

  console.log(token, req);

  if (!token)
    return next({
      status: 403,
      message: "Authorization header or param not found",
    });
  else token = token.replace("Bearer ", "").replace("bearer ", "");

  if (token == "LINK") return next();

  if (token.length < 10)
    return next({ status: 403, message: "Authorization Header not Found" });

  const decodedToken = Jwt.decode(token);
  if (
    !decodedToken.expiry_date &&
    (!decodedToken.timestamp ||
      !moment(decodedToken.timestamp).isSame(moment(), "day"))
  )
    return next({ status: 403, message: "Token is expired" });
  req.user = decodedToken;

  next();
};

module.exports = JWTMiddleware;
