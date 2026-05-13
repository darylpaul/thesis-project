const mysql = require('mysql2/promise');

async function run() {
  const conn = await mysql.createConnection({
    host: 'yamabiko.proxy.rlwy.net',
    port: 48037,
    user: 'root',
    password: 'xvStlABryXWoHlxAyWjAyorxEtidWzZm',
    database: 'railway'
  });

  try {
    await conn.query('ALTER TABLE answerkeys ADD COLUMN questionnaire_id INT DEFAULT NULL');
    console.log('Migration done: questionnaire_id column added to answerkeys');
  } catch (err) {
    if (err.code === 'ER_DUP_FIELDNAME') {
      console.log('Column already exists, skipping.');
    } else {
      console.error('Migration error:', err.message);
    }
  }

  await conn.end();
}

run();
