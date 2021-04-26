const express = require("express");
const requestLogger = require("./utils/requestLogger");
const errorHandler = require("./utils/errorHandler");
const AppError = require("./utils/appError");
const { NODE_ENV } = require("./utils/config");

const userRouter = require("./routes/userRouter");

const app = express();

app.use(express.json());

if (NODE_ENV !== "production") {
  app.use(requestLogger);
}

app.get("/", (req, res) => res.status(200).send("USER API, Good to go!"));

app.use("/user", userRouter);

app.use(errorHandler);

module.exports = app;
