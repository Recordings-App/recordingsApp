const express = require("express");
const middleware = require("./utils/middleware");
const AppError = require("./utils/appError");
const { PORT, NODE_ENV } = require("./utils/config");

const userRouter = require("./routes/userRouter");

const app = express();

app.use(express.json());

if (NODE_ENV !== "production") {
  app.use(middleware.requestLogger);
}

app.get("/", (req, res) => res.status(200).send("USER API, Good to go!"));

app.use("/user", userRouter);

app.use(middleware.errorHandler);

app.listen(PORT, () => {
  console.log(`App listening on port ${PORT}`);
});
