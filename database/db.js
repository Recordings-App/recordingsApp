const mysql = require("mysql");

const {
  NODE_ENV,
  DB_USER,
  DB_PASSWORD,
  DB_DATABASE,
  DB_HOST,
  DB_PORT,
  SQL_USER,
  SQL_DATABASE,
  SQL_PASSWORD,
  INSTANCE_CONNECTION_NAME,
} = require("../utils/config");

// Database Connection for Production

// let config = {
//   user: SQL_USER,
//   database: SQL_DATABASE,
//   password: SQL_PASSWORD,
//   socketPath: `/cloudsql/${INSTANCE_CONNECTION_NAME}`,
//   // host: dbSocketAddr[0], // e.g. '127.0.0.1'
//   // port: dbSocketAddr[1], // e.g. '3306'
// };

// if (INSTANCE_CONNECTION_NAME && NODE_ENV === "production") {
//
// }

// let connection = mysql.createConnection(config);

// Database Connection for Development

let connection = mysql.createConnection({
  host: DB_HOST,
  user: DB_USER,
  database: DB_DATABASE,
  password: DB_PASSWORD,
  port: DB_PORT,
});

connection.connect(function (err) {
  if (err) {
    console.log(err);
    console.error("Error connecting: " + err.stack);
    return;
  }
  console.log("Connected as thread id: " + connection.threadId);
});

module.exports = connection;
