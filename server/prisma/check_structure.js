const mysql = require('mysql2/promise');
require('dotenv').config();
(async () => {
  const url = process.env.DATABASE_URL;
  if (!url) return console.error('No DATABASE_URL');
  // Parse URL
  const m = url.match(/mysql:\/\/(.*?):(.*?)@(.*?):(\d+)\/(.*)/);
  if (!m) return console.error('DATABASE_URL parse failed');
  const user = m[1];
  const pass = m[2];
  const host = m[3];
  const port = m[4];
  const db = m[5].split('?')[0];
  const con = await mysql.createConnection({host, port, user, password: pass, database: db});
  const [rows] = await con.execute("SELECT TABLE_NAME, COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND (COLUMN_NAME LIKE '%structure%' OR COLUMN_NAME = 'characterId' OR COLUMN_NAME = 'removable' OR COLUMN_NAME = 'containerIndex')", [db]);
  console.table(rows);
  await con.end();
})();