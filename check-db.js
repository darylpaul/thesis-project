const mysql = require('mysql2/promise');

async function run() {
  const conn = await mysql.createConnection({
    host: 'yamabiko.proxy.rlwy.net',
    port: 48037,
    user: 'root',
    password: 'xvStlABryXWoHlxAyWjAyorxEtidWzZm',
    database: 'railway'
  });

  const [rows] = await conn.query('SHOW TABLES');
  console.log('Tables in Railway MySQL:');
  rows.forEach(r => console.log(' -', Object.values(r)[0]));
  await conn.end();
}

run();
