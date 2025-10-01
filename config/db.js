import mysql from "mysql2/promise";

export const db = mysql.createPool({
  host: "localhost",
  user: "gpsuser",
  password: "Gps@2025Secure!",
  database: "tracking_db"
});
