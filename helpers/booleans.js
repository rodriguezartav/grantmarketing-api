module.exports.IS_DEV_TEST =
  (!process.env.LOCAL && process.env.NODE_ENV == "development") ||
  process.env.NODE_ENV == "test" ||
  process.env.NODE_ENV == "test_local";
