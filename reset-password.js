const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

async function run() {
  const conn = await mysql.createConnection({
    host: 'yamabiko.proxy.rlwy.net',
    port: 48037,
    user: 'root',
    password: 'xvStlABryXWoHlxAyWjAyorxEtidWzZm',
    database: 'railway'
  });

  const newPassword = 'Teacher@123';
  const hash = await bcrypt.hash(newPassword, 10);
  await conn.query('UPDATE users SET password = ? WHERE email = ?', [hash, 'darylpaul@mindfulschool.com']);
  console.log('Password reset to: Teacher@123');
  await conn.end();
}

run();
