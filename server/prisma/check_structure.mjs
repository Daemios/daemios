import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();
const url = process.env.DATABASE_URL;
if (!url) {
  console.error('No DATABASE_URL');
  process.exit(1);
}
const m = url.match(/mysql:\/\/(.*?):(.*?)@(.*?):(\d+)\/(.*)/);
if (!m) {
  console.error('DATABASE_URL parse failed');
  process.exit(1);
}
const user = m[1];
const pass = m[2];
const host = m[3];
const port = Number(m[4]);
const db = m[5].split('?')[0];
(async () => {
  const con = await mysql.createConnection({host, port, user, password: pass, database: db});
  const [rows] = await con.execute("SELECT TABLE_NAME, COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND (COLUMN_NAME LIKE '%structure%' OR COLUMN_NAME = 'characterId' OR COLUMN_NAME = 'removable' OR COLUMN_NAME = 'containerIndex')", [db]);
  console.table(rows);
  await con.end();
})();