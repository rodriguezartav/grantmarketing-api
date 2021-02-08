require("dotenv").config();

var createError = require("http-errors");
var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");

const knex = require("./helpers/knex");
const cors = require("cors");
const { makeRouter } = require("./routes/standard");
const XeroIntegration = require("./routes/integrations/xero");
const SalesforceIntegration = require("./routes/integrations/salesforce");

const Login = require("./routes/login");
const Jwt = require("./middleware/jwt");

var app = express();

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));
//
app.options("*", cors()); // enable pre-flight request for DELETE request

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.options("*", cors()); // enable pre-flight request for DELETE request
app.use("*",cors()); // enable pre-flight request for DELETE request

app.get("/", (req, res) => {
  res.render("index");
});

app.get("/connect/:customer_id/:provider", (req, res) => {
  res.render("connect", { ...req.params, url: process.env.API_URL });
});

app.use("/integrations/xero", cors(),XeroIntegration);
app.use("/integrations/salesforce",cors(), SalesforceIntegration);

app.use("/api/login",cors(), Login);
app.use("/api/schemas", cors(),require("./routes/schemas"));
app.use("/api/:resource", cors(),Jwt, makeRouter());

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  if (req.xhr || req.headers.accept.indexOf('json') > -1) {
    console.log(err.stack)
    return res.send(err.message);
  }
    
  else res.render("error",{stack:err.stack || "", message:err.message});
});

module.exports = app;
