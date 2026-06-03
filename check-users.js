const mysql = require('mysql2/promise');

async function run() {
  const conn = await mysql.createConnection({
    host: 'yamabiko.proxy.rlwy.net',
    port: 48037,
    user: 'root',
    password: 'xvStlABryXWoHlxAyWjAyorxEtidWzZm',
    database: 'railway'
  });

  const [rows] = await conn.query('SELECT id, fullname, email, role FROM users');
  console.log('Users in Railway DB:');
  rows.forEach(r => console.log(` - [${r.role}] ${r.fullname} | ${r.email}`));
  await conn.end();
}

run();
