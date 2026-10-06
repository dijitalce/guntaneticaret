import mysql from "mysql2/promise";
import { mysqlConnectOptions } from "./mysql-options";

const url = process.env.DATABASE_URL ?? "mysql://guntan:guntan@localhost:3306/guntan";
const pool = mysql.createPool({
  ...mysqlConnectOptions(url, { connectionLimit: 1 }),
});

const sql = "ALTER TABLE `vehicle_generations` ADD COLUMN `image_url` text NULL AFTER `year_to`";
try {
  await pool.query(sql);
  console.log("OK", sql);
} catch (err) {
  const e = err as { errno?: number; code?: string };
  if (e.errno === 1060 || e.code === "ER_DUP_FIELDNAME") console.log("skip (exists)", sql);
  else throw err;
}

await pool.end();
