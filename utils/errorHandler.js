const AppError = require("../utils/appError");
const config = require("./config");

const showError = (err) => {
  console.log("--------------------------------------------------");
  console.log(err);
  console.log("--------------------------------------------------");
};

const handleDuplicateKeyDB = (err) => {
  const keys = err.split(" ")[4].split(".");
  //SQLITE_CONSTRAINT: UNIQUE constraint failed: table_name.column_name
  const message = `Duplicate ${keys[0]}: ${keys[1]}. Use another value`;
  return new AppError(message, 400);
};

const handleJWTError = () => {
  return new AppError("Invalid token. Please log in again!", 401);
};

const handleJWTExpiredError = () => {
  return new AppError("Your token has expired! Please log in again.", 401);
};

const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack,
  });
};

const sendErrorProd = (err, res) => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });

    // Programming or other unknown error: don't leak error details
  } else {
    // 1) Log error
    console.error("ERROR ", err);

    // 2) Send generic message
    res.status(500).json({
      status: "error",
      message: "Something went very wrong! Please try again in some time.",
    });
  }
};

const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";
  err.message = err.message || "Something is not right.";

  if (config.NODE_ENV === "development") {
    sendErrorDev(err, res);
  } else if (config.NODE_ENV === "production") {
    let error = { ...err };
    error.message = err.message;

    if (error.message.split(":")[0] === "SQLITE_CONSTRAINT")
      error = handleDuplicateKeyDB(error.message);
    if (error.name === "JsonWebTokenError") error = handleJWTError();
    if (error.name === "TokenExpiredError") error = handleJWTExpiredError();

    sendErrorProd(error, res);
  }
};

module.exports = errorHandler;
