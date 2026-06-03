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
    // Show existing tables first
    const [tables] = await conn.query('SHOW TABLES');
    console.log('Current tables:');
    tables.forEach(r => console.log(' -', Object.values(r)[0]));

    // Create archives table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS archives (
        id              INT AUTO_INCREMENT PRIMARY KEY,
        table_name      VARCHAR(100) NOT NULL,
        item_id         INT NOT NULL,
        item_name       VARCHAR(255),
        item_data       LONGTEXT,
        reason          TEXT,
        deleted_by_id   INT,
        deleted_by_name VARCHAR(255),
        deleted_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at      TIMESTAMP NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('\narchives table created (or already existed).');

    // Confirm it's there
    const [cols] = await conn.query('DESCRIBE archives');
    console.log('Columns:', cols.map(c => c.Field).join(', '));

  } catch (err) {
    console.error('Error:', err.message);
  }

  await conn.end();
}

run();
