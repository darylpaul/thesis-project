const fs = require('fs');
const mysql = require('mysql2/promise');

const sql = fs.readFileSync('C:/Users/CHARLENE/Downloads/thesis_project.sql', 'utf8');

const statements = sql
  .split(/;\s*\n/)
  .map(s => s.trim())
  .filter(s => s.length > 0);

async function run() {
  const conn = await mysql.createConnection({
    host: 'yamabiko.proxy.rlwy.net',
    port: 48037,
    user: 'root',
    password: 'xvStlABryXWoHlxAyWjAyorxEtidWzZm',
    database: 'railway',
    multipleStatements: true
  });

  console.log('Connected to Railway MySQL');

  for (const stmt of statements) {
    try {
      await conn.query(stmt);
    } catch (err) {
      console.error('Error on statement:', stmt.substring(0, 80));
      console.error(err.message);
    }
  }

  console.log('Done!');
  await conn.end();
}

run();
