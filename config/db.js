// import mysql from "mysql2/promise";

// export const db = await mysql.createPool({
//   host: "localhost",
//   user: "root",
//   password: "",
//   database: "tracking_db"
// });

import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

export const db = await mysql.createPool({
  host: process.env.DB_HOST || "127.0.0.1", // Force IPv4
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "tracking_db",
  port: 3306,
  // Optional: fallback to socket if running locally
  socketPath: "/var/run/mysqld/mysqld.sock"
});
