import mysql from "mysql2/promise";

export const db = mysql.createPool({
  host: "127.0.0.1",
  user: "000",
  password: "Gps@2025Secure!",
  database: "tracking_db"
});
