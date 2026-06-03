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
    // 1. Show all tables
    const [tables] = await conn.query('SHOW TABLES');
    console.log('=== TABLES ===');
    tables.forEach(r => console.log(' -', Object.values(r)[0]));

    // 2. Check if archives table exists and its columns
    console.log('\n=== ARCHIVES TABLE STRUCTURE ===');
    try {
      const [cols] = await conn.query('DESCRIBE archives');
      cols.forEach(c => console.log(` ${c.Field} | ${c.Type} | Null:${c.Null} | Default:${c.Default}`));
    } catch (e) {
      console.log(' !! archives table does NOT exist:', e.message);
    }

    // 3. Check all foreign key constraints
    console.log('\n=== FOREIGN KEY CONSTRAINTS ===');
    const [fks] = await conn.query(`
      SELECT TABLE_NAME, COLUMN_NAME, CONSTRAINT_NAME,
             REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
      WHERE REFERENCED_TABLE_SCHEMA = 'railway'
      ORDER BY TABLE_NAME
    `);
    if (fks.length === 0) {
      console.log(' No foreign key constraints found.');
    } else {
      fks.forEach(f => console.log(` ${f.TABLE_NAME}.${f.COLUMN_NAME} → ${f.REFERENCED_TABLE_NAME}.${f.REFERENCED_COLUMN_NAME}`));
    }

  } catch (err) {
    console.error('Error:', err.message);
  }

  await conn.end();
}

run();
