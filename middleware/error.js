class ErrorHandler extends Error {
  constructor(statusCode, message) {
    super();
    this.statusCode = statusCode;
    this.message = message;
  }
}

var ErrorMiddleware = function(req, res, next) {
  req.Error = ErrorHandler;

  req.throwError = (code, errorType, errorMessage) => error => {
    if (!error) error = new Error(errorMessage || "Default Error");
    error.code = code;
    error.errorType = errorType;
    throw error;
  };
  req.throwIf = (fn, code, errorType, errorMessage) => result => {
    if (fn(result)) {
      return throwError(code, errorType, errorMessage)();
    }
    return result;
  };

  res.sendError = (res, status, message) => (error = {}) => {
    res.status(status || error.status).json({
      type: "error",
      message: message || error.message,
      error
    });
  };
  next();
};

module.exports = ErrorMiddleware;
