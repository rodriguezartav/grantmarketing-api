require("dotenv").config();

var createError = require("http-errors");
var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");
const bodyParser = require("body-parser");

const cors = require("cors");
const { makeRouter } = require("./routes/standard");
const XeroIntegration = require("./routes/integrations/xero");
const SalesforceIntegration = require("./routes/integrations/salesforce");
const SlackIntegration = require("./routes/integrations/slack");
const GoogleIntegration = require("./routes/integrations/google");

const Login = require("./routes/login");
const UserLogin = require("./routes/userLogin");
const Jwt = require("./middleware/jwt");

if (process.env.NODE_ENV == "production") require("./workers/jobCreator");
if (process.env.NODE_ENV == "production") require("./workers/refreshWorker");

var app = express();

// view engine setup

// Tell the bodyparser middleware to accept more data
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));

app.use(express.static(path.join(__dirname, "public")));
//
app.options("*", cors()); // enable pre-flight request for DELETE request

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.options("*", cors()); // enable pre-flight request for DELETE request
app.use("*", cors()); // enable pre-flight request for DELETE request

app.use("/integrations/xero", cors(), XeroIntegration);
app.use("/integrations/salesforce", cors(), SalesforceIntegration);
app.use("/integrations/google", cors(), GoogleIntegration);
app.use("/integrations/slack", cors(), SlackIntegration);
app.use("/integrations/heroku", cors(), require("./integrations/heroku"));

app.use(
  "/webhooks/papertrail",
  cors(),
  require("./routes/webhooks/papertrail")
);

app.use("/api/login", cors(), Login);
app.use("/api/userLogin", cors(), UserLogin);
app.use("/vpi/schemas", cors(), require("./routes/schemas"));
app.use("/vpi/scripts", cors(), require("./routes/scripts"));
app.use("/api/:resource", cors(), Jwt, makeRouter());

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  return res.status(404).json({ status: 404 });
});

// error handler
app.use(function (err, req, res, next) {
  // render the error page
  res.status(err.status || 500);

  return res.json({
    message: err.message,
    status: err.status || 500,
    stack: err.stack,
  });
});

module.exports = app;
