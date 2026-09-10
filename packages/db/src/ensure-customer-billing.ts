import mysql from "mysql2/promise";
import { mysqlConnectOptions } from "./mysql-options";

const url = process.env.DATABASE_URL ?? "mysql://guntan:guntan@localhost:3306/guntan";
const pool = mysql.createPool({
  ...mysqlConnectOptions(url, { connectionLimit: 1 }),
});

const alters = [
  "ALTER TABLE `customers` ADD COLUMN `invoice_type` varchar(32) NOT NULL DEFAULT 'individual'",
  "ALTER TABLE `customers` ADD COLUMN `company_name` varchar(255) NULL",
  "ALTER TABLE `customers` ADD COLUMN `tax_office` varchar(128) NULL",
  "ALTER TABLE `customers` ADD COLUMN `tax_number` varchar(64) NULL",
  "ALTER TABLE `customers` ADD COLUMN `national_id` varchar(32) NULL",
  "ALTER TABLE `customer_addresses` ADD COLUMN `kind` varchar(32) NOT NULL DEFAULT 'shipping'",
];

for (const sql of alters) {
  try {
    await pool.query(sql);
    console.log("OK", sql);
  } catch (err) {
    const e = err as { errno?: number; code?: string; message?: string };
    if (e.errno === 1060 || e.code === "ER_DUP_FIELDNAME") {
      console.log("skip (exists)", sql);
      continue;
    }
    throw err;
  }
}

await pool.end();
console.log("Customer billing columns ensured.");
