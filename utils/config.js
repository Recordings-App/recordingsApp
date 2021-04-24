require("dotenv").config();

const PORT = process.env.PORT || 3000;

const DB_USER = process.env.DB_USER;
const DB_NAME = process.env.DB_NAME;
const DB_PASSWORD = process.env.DB_PASSWORD;
const INSTANCE_CONNECTION_NAME = process.env.INSTANCE_CONNECTION_NAME;
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN;
// const JWT_COOKIE_EXPIRES_IN = process.env.JWT_COOKIE_EXPIRES_IN;

module.exports = {
  PORT,
  DB_USER,
  DB_NAME,
  DB_PASSWORD,
  INSTANCE_CONNECTION_NAME,
  JWT_SECRET,
  JWT_EXPIRES_IN,
};
