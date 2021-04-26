require("dotenv").config();

const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV;
const DB_USER = process.env.DB_USER;
const DB_NAME = process.env.DB_NAME;
const DB_PASSWORD = process.env.DB_PASSWORD;
const DB_DATABASE = process.env.DB_DATABASE;
const DB_PORT = process.env.DB_PORT;
const INSTANCE_CONNECTION_NAME = process.env.INSTANCE_CONNECTION_NAME;
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN;
const SQL_USER = process.env.SQL_USER;
const SQL_PASSWORD = process.env.SQL_PASSWORD;
const SQL_DATABASE = process.env.SQL_DATABASE;
// const JWT_COOKIE_EXPIRES_IN = process.env.JWT_COOKIE_EXPIRES_IN;

module.exports = {
  NODE_ENV,
  PORT,
  DB_USER,
  DB_NAME,
  DB_PASSWORD,
  DB_PORT,
  DB_DATABASE,
  INSTANCE_CONNECTION_NAME,
  JWT_SECRET,
  JWT_EXPIRES_IN,
  SQL_DATABASE,
  SQL_PASSWORD,
  SQL_USER,
};
