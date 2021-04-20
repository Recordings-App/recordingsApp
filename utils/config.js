require("dotenv").config();

const PORT = process.env.PORT || 3000;

const DB_USER = process.env.DB_USER;
const DB_NAME = process.env.DB_NAME;
const DB_PASSWORD = process.env.DB_PASSWORD;
const INSTANCE_CONNECTION_NAME = process.env.INSTANCE_CONNECTION_NAME;

module.exports = {
  PORT,
  DB_USER,
  DB_NAME,
  DB_PASSWORD,
  INSTANCE_CONNECTION_NAME,
};
