import pkg from "pg";
const { Pool } = pkg;

import dotenv from "dotenv";
dotenv.config();

console.log("Connecting to database:", process.env.PG_DATABASE);

const pool = new Pool({
  host: process.env.PG_HOST,
  port: process.env.PG_PORT,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  database: process.env.PG_DATABASE,
});

pool.connect()
  .then((client) => {
    console.log("✅ Successfully connected to the database");
    client.release();
  })
  .catch((err) => {
    console.error("❌ Error connecting to the database:", err.message);
  });

export default pool;