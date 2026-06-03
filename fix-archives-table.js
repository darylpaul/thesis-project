const mysql = require('mysql2/promise');

async function run() {
  const conn = await mysql.createConnection({
    host:     'yamabiko.proxy.rlwy.net',
    port:     48037,
    user:     'root',
    password: 'xvStlABryXWoHlxAyWjAyorxEtidWzZm',
    database: 'railway'
  });

  try {
    // Fix: allow expires_at to be NULL (currently NOT NULL which breaks every delete)
    await conn.query('ALTER TABLE archives MODIFY expires_at DATETIME NULL DEFAULT NULL');
    console.log('Fixed: expires_at column now allows NULL');

    // Verify
    const [cols] = await conn.query('DESCRIBE archives');
    console.log('\nUpdated archives table:');
    cols.forEach(c => console.log(` ${c.Field} | Null:${c.Null} | Default:${c.Default}`));

    console.log('\nDone! Try deleting anything now.');
  } catch (err) {
    console.error('Error:', err.message);
  }

  await conn.end();
}

run();
