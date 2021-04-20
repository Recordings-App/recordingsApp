const express = require("express");
const mysql = require("mysql");
const {
  PORT,
  DB_USER,
  DB_PASSWORD,
  DB_NAME,
  INSTANCE_CONNECTION_NAME,
} = require("./utils/config");

const app = express();

app.use(express.json());

app.listen(PORT, () => {
  console.log(`App listening on port ${PORT}`);
});

const pool = mysql.createPool({
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
  socketPath: `/cloudsql/${INSTANCE_CONNECTION_NAME}`,
});

app.get("/", (req, res, next) => {
  res.status(200).send("Kem Palty Jijaji !");
});

app.get("/:email", async (req, res, next) => {
  console.log(pool);
  const query = `SELECT * FROM users WHERE email = ?`;
  pool.query(query, [req.params.email], (err, results) => {
    console.log(results);

    if (!results[0]) {
      res.json({ status: "Not Found" });
    } else {
      res.json(results[0]);
    }
  });
});
