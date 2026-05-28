const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
const db = require('./db');
require('dotenv').config();

const app = express();
app.use(express.json());

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:5500', 'http://127.0.0.1:5500'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, same-origin)
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// ===========================
// HELPERS
// ===========================
function getUser(req) {
  try {
    let token = req.headers.authorization;
    if (!token) return null;
    if (token.startsWith("Bearer ")) token = token.slice(7);
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch { return null; }
}

// Admin-only middleware
function requireAdmin(req, res, next) {
  const user = getUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  if (user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
  next();
}

// Login rate limiter — 5 wrong attempts triggers lockout: 1 min on 1st offense, 5 mins thereafter
// Separate maps so teacher and admin lockouts don't affect each other
const teacherLoginAttempts = new Map();
const adminLoginAttempts   = new Map();
function checkLoginRateLimit(ip, store) {
  const now = Date.now();
  let entry = store.get(ip);

  if (!entry) {
    store.set(ip, { count: 1, offenses: 0, lockedUntil: null });
    return { allowed: true };
  }

  // Currently locked out
  if (entry.lockedUntil && entry.lockedUntil > now) {
    const minutesLeft = Math.ceil((entry.lockedUntil - now) / 60000);
    return { allowed: false, minutesLeft };
  }

  // Lockout just expired — reset attempt count, preserve offense history
  if (entry.lockedUntil !== null && entry.lockedUntil <= now) {
    entry.count = 1;
    entry.lockedUntil = null;
    return { allowed: true };
  }

  // 5 failed attempts reached — apply lockout
  if (entry.count >= 5) {
    entry.offenses++;
    const lockMinutes = entry.offenses === 1 ? 1 : 5;
    entry.lockedUntil = now + lockMinutes * 60 * 1000;
    return { allowed: false, minutesLeft: lockMinutes };
  }

  entry.count++;
  return { allowed: true };
}
function resetLoginAttempts(ip, store) { store.delete(ip); }

async function logActivity(userId, userName, action, details = '', platform = 'web') {
  try {
    // If user info missing, try to get from DB
    let name = userName;
    if (!name && userId) {
      try {
        const [rows] = await db.query('SELECT fullname FROM users WHERE id = ?', [userId]);
        if (rows.length) name = rows[0].fullname;
      } catch {}
    }
    await db.query(
      'INSERT INTO activity_logs (user_id, user_name, action, details, platform) VALUES (?, ?, ?, ?, ?)',
      [userId, name || 'Unknown', action, details, platform]
    );
  } catch (err) { console.log('Log error:', err); }
}

// ===========================
// TEST ROUTE
// ===========================
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'LogIn_Page', 'LogIn_Page.html')));

// ===========================
// AUTH ROUTES
// ===========================
// Signup disabled — only admin can create teacher accounts
// ===========================
// ARCHIVE SYSTEM
// ===========================


// Archive an item instead of deleting it
app.post('/api/archive', async (req, res) => {
  const user = getUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  const { table, item_id, item_name, item_data, reason } = req.body;

  // Validate allowed tables
  const allowed = ['sections','students','subjects','questionnaires','answerkeys','records','users'];
  if (!allowed.includes(table)) return res.status(400).json({ error: 'Invalid table' });

  try {
    // Store in archive
    await db.query(
      `INSERT INTO archives (table_name, item_id, item_name, item_data, reason, deleted_by_id, deleted_by_name, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NULL)`,
      [table, item_id, item_name, JSON.stringify(item_data), reason, user.id, user.fullname]
    );

    // When deleting a questionnaire, also remove its linked answer key
    if (table === 'questionnaires') {
      await db.query('DELETE FROM answerkeys WHERE questionnaire_id=?', [item_id]);
    }

    // Now actually delete from original table
    await db.query(`DELETE FROM ${table} WHERE id=?`, [item_id]);

    await logActivity(user.id, user.fullname, 'ARCHIVE_DELETE',
      `Archived ${table} "${item_name}": ${reason}`, req.body.platform||'web');

    res.json({ message: 'Archived successfully!' });
  } catch (err) { console.log(err); res.status(500).json({ error: 'Server error' }); }
});

// Get all archives (admin only)
app.get('/api/archives', async (req, res) => {
  const user = getUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const limit  = Math.min(parseInt(req.query.limit)  || 200, 500);
    const offset = parseInt(req.query.offset) || 0;
    const [rows] = await db.query(
      'SELECT * FROM archives ORDER BY deleted_at DESC LIMIT ? OFFSET ?',
      [limit, offset]
    );
    res.json(rows);
  } catch (err) { console.log(err); res.status(500).json({ error: 'Server error' }); }
});

// Whitelist of valid columns per table — only these can be restored
const RESTORE_COLUMNS = {
  sections:       ['id','name','grade','adviser','user_id','created_at'],
  students:       ['id','first_name','last_name','student_id','section_id','user_id','created_at'],
  subjects:       ['id','name','code','created_at'],
  questionnaires: ['id','title','type','section_id','subject_id','questions','user_id','created_at'],
  answerkeys:     ['id','title','type','section_id','subject_id','answers','user_id','questionnaire_id','created_at'],
  records:        ['id','student_id_fk','section_id','subject_id','answer_key_id','score','total','percentage','user_id','created_at'],
  users:          ['id','fullname','email','password','role','created_at'],
};

// Restore an archived item
app.post('/api/archives/:id/restore', async (req, res) => {
  const user = getUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const [rows] = await db.query('SELECT * FROM archives WHERE id=?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Archive not found' });

    const arc   = rows[0];
    const data  = JSON.parse(arc.item_data);
    const table = arc.table_name;

    // Only keep columns that are in the whitelist for this table
    const allowed = RESTORE_COLUMNS[table];
    if (!allowed) return res.status(400).json({ error: 'Cannot restore this item type.' });

    const safeData = Object.fromEntries(
      Object.entries(data).filter(([col]) => allowed.includes(col))
    );

    // For users (teachers), keep the original id so user_id references stay valid.
    const keepId = (table === 'users');
    const filteredData = Object.fromEntries(
      Object.entries(safeData).filter(([col]) => keepId || col !== 'id')
    );

    // Convert ISO date strings (from JSON serialization) to MySQL datetime format
    const toMysqlDate = (val) => {
      if (val instanceof Date) return val.toISOString().slice(0, 19).replace('T', ' ');
      if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(val))
        return val.slice(0, 19).replace('T', ' ');
      return val;
    };

    if (Object.keys(filteredData).length === 0)
      return res.status(400).json({ error: 'No restorable data found in archive.' });

    const cols  = Object.keys(filteredData).join(', ');
    const vals  = Object.values(filteredData).map(toMysqlDate);
    const marks = vals.map(() => '?').join(', ');

    console.log(`[RESTORE] table=${table} cols=${cols}`);
    console.log(`[RESTORE] vals=`, vals);

    // Delete any conflicting row first (same id or email), then insert cleanly
    if (filteredData.id) {
      await db.query(`DELETE FROM ${table} WHERE id = ?`, [filteredData.id]).catch(() => {});
    }
    if (filteredData.email) {
      await db.query(`DELETE FROM ${table} WHERE email = ?`, [filteredData.email]).catch(() => {});
    }

    await db.query(`INSERT INTO ${table} (${cols}) VALUES (${marks})`, vals);

    await db.query('DELETE FROM archives WHERE id=?', [req.params.id]);
    await logActivity(user.id, user.fullname, 'RESTORE',
      `Restored ${table} "${arc.item_name}"`, 'web');

    res.json({ message: 'Item restored!' });
  } catch (err) {
    console.error('[RESTORE ERROR]', err.message, err.code);
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

// Permanently delete from archive
app.delete('/api/archives/:id', async (req, res) => {
  const user = getUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  try {
    await db.query('DELETE FROM archives WHERE id=?', [req.params.id]);
    res.json({ message: 'Permanently deleted!' });
  } catch (err) { console.log(err); res.status(500).json({ error: 'Server error' }); }
});

// ── Password strength validator ──
function validatePassword(password) {
  if (!password || password.length < 8)
    return 'Password must be at least 8 characters.';
  if (!/[A-Z]/.test(password))
    return 'Password must contain at least one uppercase letter (A-Z).';
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\|,.<>\/?]/.test(password))
    return 'Password must contain at least one special character (!@#$%^&*).';
  return null; // valid
}

// Verify password (used for delete confirmation)
app.post('/api/verify-password', async (req, res) => {
  const { password } = req.body;
  const user = getUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const [rows] = await db.query('SELECT password FROM users WHERE id=?', [user.id]);
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    const match = await bcrypt.compare(password, rows[0].password);
    if (!match) return res.status(400).json({ error: 'Incorrect password' });
    res.json({ verified: true });
  } catch (err) { console.log(err); res.status(500).json({ error: 'Server error' }); }
});

app.post('/api/signup', async (req, res) => {
  res.status(403).json({ error: 'Self-registration is disabled. Contact the admin to create your account.' });
});

app.post('/api/login', async (req, res) => {
  const ip = req.ip || req.socket.remoteAddress;
  const limit = checkLoginRateLimit(ip, teacherLoginAttempts);
  if (!limit.allowed)
    return res.status(429).json({ error: `Too many failed attempts. Try again in ${limit.minutesLeft} minute${limit.minutesLeft !== 1 ? 's' : ''}.` });

  const { email, password, platform } = req.body;
  try {
    const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });
    const validPassword = await bcrypt.compare(password, rows[0].password);
    if (!validPassword) return res.status(401).json({ error: 'Invalid credentials' });
    if (rows[0].role === 'admin') return res.status(403).json({ error: 'Use the admin portal to login' });
    resetLoginAttempts(ip, teacherLoginAttempts);
    const token = jwt.sign({ id: rows[0].id, fullname: rows[0].fullname, role: rows[0].role }, process.env.JWT_SECRET, { expiresIn: '8h' });
    await logActivity(rows[0].id, rows[0].fullname, 'LOGIN', `Logged in via ${platform || 'web'}`, platform || 'web');
    res.json({ token, fullname: rows[0].fullname, role: rows[0].role || 'teacher', message: 'Login successful!' });
  } catch (err) { console.log(err); res.status(500).json({ error: 'Server error' }); }
});

// ===========================
// ADMIN AUTH
// ===========================
app.post('/api/admin/login', async (req, res) => {
  const ip = req.ip || req.socket.remoteAddress;
  const limit = checkLoginRateLimit(ip, adminLoginAttempts);
  if (!limit.allowed)
    return res.status(429).json({ error: `Too many failed attempts. Try again in ${limit.minutesLeft} minute${limit.minutesLeft !== 1 ? 's' : ''}.` });

  const { email, password } = req.body;
  try {
    const [rows] = await db.query('SELECT * FROM users WHERE email = ? AND role = ?', [email, 'admin']);
    if (rows.length === 0) return res.status(401).json({ error: 'Invalid admin credentials' });
    const validPassword = await bcrypt.compare(password, rows[0].password);
    if (!validPassword) return res.status(401).json({ error: 'Invalid admin credentials' });
    resetLoginAttempts(ip, adminLoginAttempts);
    const token = jwt.sign({ id: rows[0].id, fullname: rows[0].fullname, role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '8h' });
    await logActivity(rows[0].id, rows[0].fullname, 'ADMIN_LOGIN', 'Admin logged in', 'web');
    res.json({ token, fullname: rows[0].fullname, role: 'admin', message: 'Admin login successful!' });
  } catch (err) { console.log(err); res.status(500).json({ error: 'Server error' }); }
});

// ===========================
// TEACHER — STATS (single request for dashboard)
// ===========================
app.get('/api/teacher/stats', async (req, res) => {
  const user = getUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const [[sections]]       = await db.query('SELECT COUNT(*) as count FROM sections WHERE user_id=?',       [user.id]);
    const [[students]]       = await db.query('SELECT COUNT(*) as count FROM students WHERE user_id=?',       [user.id]);
    const [[questionnaires]] = await db.query('SELECT COUNT(*) as count FROM questionnaires WHERE user_id=?', [user.id]);
    const [[answerkeys]]     = await db.query('SELECT COUNT(*) as count FROM answerkeys WHERE user_id=?',     [user.id]);
    const [[records]]        = await db.query('SELECT COUNT(*) as count FROM records WHERE user_id=?',        [user.id]);
    const [[subjects]]       = await db.query('SELECT COUNT(*) as count FROM subjects');
    res.json({ sections: sections.count, students: students.count, questionnaires: questionnaires.count, answerkeys: answerkeys.count, records: records.count, subjects: subjects.count });
  } catch (err) { console.log(err); res.status(500).json({ error: 'Server error' }); }
});

// ===========================
// ADMIN — STATS
// ===========================
app.get('/api/admin/stats', requireAdmin, async (req, res) => {
  try {
    const [[teachers]]       = await db.query('SELECT COUNT(*) as count FROM users WHERE role = "teacher"');
    const [[questionnaires]] = await db.query('SELECT COUNT(*) as count FROM questionnaires');
    const [[answerkeys]]     = await db.query('SELECT COUNT(*) as count FROM answerkeys');
    const [[records]]        = await db.query('SELECT COUNT(*) as count FROM records');
    const [[sections]]       = await db.query('SELECT COUNT(*) as count FROM sections');
    const [[students]]       = await db.query('SELECT COUNT(*) as count FROM students');
    res.json({ teachers: teachers.count, questionnaires: questionnaires.count, answerkeys: answerkeys.count, records: records.count, sections: sections.count, students: students.count });
  } catch (err) { console.log(err); res.status(500).json({ error: 'Server error' }); }
});

// ===========================
// ADMIN — TEACHERS
// ===========================
app.get('/api/admin/teachers', requireAdmin, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT u.id, u.fullname, u.email, u.created_at,
        (SELECT COUNT(*) FROM questionnaires WHERE user_id = u.id) as questionnaire_count,
        (SELECT COUNT(*) FROM records WHERE user_id = u.id) as record_count,
        (SELECT MAX(created_at) FROM activity_logs WHERE user_id = u.id) as last_active
      FROM users u WHERE u.role = 'teacher' ORDER BY u.fullname ASC`);
    res.json(rows);
  } catch (err) { console.log(err); res.status(500).json({ error: 'Server error' }); }
});

// Admin creates teacher account
app.post('/api/admin/create-teacher', requireAdmin, async (req, res) => {
  const { fullname, email, password } = req.body;
  const pwError = validatePassword(password);
  if (pwError) return res.status(400).json({ error: pwError });
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    await db.query(
      'INSERT INTO users (fullname, email, password, role) VALUES (?, ?, ?, ?)',
      [fullname, email, hashedPassword, 'teacher']
    );
    res.json({ message: 'Teacher account created!' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Email already exists.' });
    console.log(err); res.status(500).json({ error: 'Server error' });
  }
});

// Admin resets teacher password
app.put('/api/admin/teachers/:id/reset-password', requireAdmin, async (req, res) => {
  const { password } = req.body;
  const pwError = validatePassword(password);
  if (pwError) return res.status(400).json({ error: pwError });
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    await db.query('UPDATE users SET password = ? WHERE id = ? AND role = "teacher"', [hashedPassword, req.params.id]);
    res.json({ message: 'Password reset!' });
  } catch (err) { console.log(err); res.status(500).json({ error: 'Server error' }); }
});

app.delete('/api/admin/teachers/:id', requireAdmin, async (req, res) => {
  const adminUser = getUser(req);
  try {
    const [rows] = await db.query('SELECT * FROM users WHERE id = ? AND role = "teacher"', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Teacher not found' });
    const teacher = rows[0];

    // Archive before deleting so the account can be restored
    await db.query(
      `INSERT INTO archives (table_name, item_id, item_name, item_data, reason, deleted_by_id, deleted_by_name, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NULL)`,
      ['users', teacher.id, teacher.fullname, JSON.stringify(teacher),
       'Teacher account removed by admin',
       adminUser ? adminUser.id : null, adminUser ? adminUser.fullname : 'Admin']
    );

    await db.query('DELETE FROM users WHERE id = ? AND role = "teacher"', [req.params.id]);
    if (adminUser) await logActivity(adminUser.id, adminUser.fullname, 'DELETE_TEACHER',
      `Archived teacher: ${teacher.fullname}`, 'web');
    res.json({ message: 'Teacher archived!' });
  } catch (err) { console.log(err); res.status(500).json({ error: 'Server error' }); }
});

// ===========================
// ADMIN — ACTIVITY LOGS
// ===========================
app.get('/api/admin/logs', requireAdmin, async (req, res) => {
  try {
    const limit  = Math.min(parseInt(req.query.limit)  || 100, 500);
    const offset = parseInt(req.query.offset) || 0;
    let query = 'SELECT * FROM activity_logs';
    let params = [];
    if (req.query.user_id) { query += ' WHERE user_id = ?'; params.push(req.query.user_id); }
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (err) { console.log(err); res.status(500).json({ error: 'Server error' }); }
});

// ===========================
// SECTIONS ROUTES
// ===========================
app.get('/api/sections', async (req, res) => {
  const user = getUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const [rows] = await db.query(
      `SELECT sections.*, COUNT(students.id) AS students
       FROM sections
       LEFT JOIN students ON students.section_id = sections.id
       WHERE sections.user_id = ?
       GROUP BY sections.id
       ORDER BY sections.name ASC`,
      [user.id]
    );
    res.json(rows);
  } catch (err) { console.log(err); res.status(500).json({ error: 'Server error' }); }
});
app.post('/api/sections', async (req, res) => {
  const { name, grade, adviser } = req.body;
  const user = getUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  try {
    await db.query('INSERT INTO sections (name, grade, adviser, user_id) VALUES (?, ?, ?, ?)', [name, grade, adviser, user.id]);
    await logActivity(user.id, user.fullname, 'CREATE_SECTION', `Created section: ${name}`, req.body.platform||'web');
    res.json({ message: 'Section added!' });
  } catch (err) { console.log(err); res.status(500).json({ error: 'Server error' }); }
});
app.put('/api/sections/:id', async (req, res) => {
  const { name, grade, adviser } = req.body;
  const user = getUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  try {
    await db.query('UPDATE sections SET name=?, grade=?, adviser=? WHERE id=? AND user_id=?', [name, grade, adviser, req.params.id, user.id]);
    res.json({ message: 'Section updated!' });
  } catch (err) { console.log(err); res.status(500).json({ error: 'Server error' }); }
});
app.delete('/api/sections/:id', async (req, res) => {
  const user = getUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  try {
    await db.query('DELETE FROM sections WHERE id=? AND user_id=?', [req.params.id, user.id]);
    res.json({ message: 'Section deleted!' });
  } catch (err) { console.log(err); res.status(500).json({ error: 'Server error' }); }
});

// ===========================
// STUDENTS ROUTES
// ===========================
app.get('/api/students', async (req, res) => {
  const user = getUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  try {
    let query = 'SELECT students.*, sections.name AS section_name FROM students LEFT JOIN sections ON students.section_id = sections.id WHERE students.user_id=? ORDER BY students.last_name ASC, students.first_name ASC';
    let params = [user.id];
    if (req.query.section_id) {
      query = 'SELECT students.*, sections.name AS section_name FROM students LEFT JOIN sections ON students.section_id = sections.id WHERE students.section_id=? AND students.user_id=? ORDER BY students.last_name ASC';
      params = [req.query.section_id, user.id];
    }
    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (err) { console.log(err); res.status(500).json({ error: 'Server error' }); }
});
app.post('/api/students', async (req, res) => {
  const { first_name, last_name, student_id, section_id, gender } = req.body;
  const user = getUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  try {
    await db.query('INSERT INTO students (first_name, last_name, student_id, section_id, gender, user_id) VALUES (?,?,?,?,?,?)', [first_name, last_name, student_id, section_id, gender || null, user.id]);
    await logActivity(user.id, user.fullname, 'CREATE_STUDENT', `Added student: ${first_name} ${last_name}`, req.body.platform||'web');
    res.json({ message: 'Student added!' });
  } catch (err) { console.log(err); res.status(500).json({ error: 'Server error' }); }
});
app.put('/api/students/:id', async (req, res) => {
  const { first_name, last_name, student_id, section_id, gender } = req.body;
  const user = getUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  try {
    await db.query('UPDATE students SET first_name=?, last_name=?, student_id=?, section_id=?, gender=? WHERE id=? AND user_id=?', [first_name, last_name, student_id, section_id, gender || null, req.params.id, user.id]);
    res.json({ message: 'Student updated!' });
  } catch (err) { console.log(err); res.status(500).json({ error: 'Server error' }); }
});
app.delete('/api/students/:id', async (req, res) => {
  const user = getUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  try {
    await db.query('DELETE FROM students WHERE id=? AND user_id=?', [req.params.id, user.id]);
    res.json({ message: 'Student deleted!' });
  } catch (err) { console.log(err); res.status(500).json({ error: 'Server error' }); }
});

// ===========================
// SUBJECTS ROUTES
// ===========================
// ── SUBJECTS — All teachers can view, only admin can add/edit/delete ──
app.get('/api/subjects', async (req, res) => {
  const user = getUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  try {
    // All teachers see all subjects (school-wide)
    const [rows] = await db.query('SELECT * FROM subjects ORDER BY name ASC');
    res.json(rows);
  } catch (err) { console.log(err); res.status(500).json({ error: 'Server error' }); }
});
app.post('/api/subjects', async (req, res) => {
  const user = getUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  if (user.role !== 'admin') return res.status(403).json({ error: 'Only admin can add subjects.' });
  const { name, code } = req.body;
  try {
    await db.query('INSERT INTO subjects (name, code) VALUES (?,?)', [name, code]);
    await logActivity(user.id, user.fullname, 'CREATE_SUBJECT', `Created subject: ${name}`, req.body.platform||'web');
    res.json({ message: 'Subject added!' });
  } catch (err) { console.log(err); res.status(500).json({ error: 'Server error' }); }
});
app.put('/api/subjects/:id', async (req, res) => {
  const user = getUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  if (user.role !== 'admin') return res.status(403).json({ error: 'Only admin can edit subjects.' });
  const { name, code } = req.body;
  try {
    await db.query('UPDATE subjects SET name=?, code=? WHERE id=?', [name, code, req.params.id]);
    res.json({ message: 'Subject updated!' });
  } catch (err) { console.log(err); res.status(500).json({ error: 'Server error' }); }
});
app.delete('/api/subjects/:id', async (req, res) => {
  const user = getUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  if (user.role !== 'admin') return res.status(403).json({ error: 'Only admin can delete subjects.' });
  try {
    await db.query('DELETE FROM subjects WHERE id=?', [req.params.id]);
    res.json({ message: 'Subject deleted!' });
  } catch (err) { console.log(err); res.status(500).json({ error: 'Server error' }); }
});

// ===========================
// QUESTIONNAIRES ROUTES
// ===========================
app.get('/api/questionnaires', async (req, res) => {
  const userQ = getUser(req);
  if (!userQ) return res.status(401).json({ error: 'Unauthorized' });
  try {
    let query = `SELECT questionnaires.*, sections.name AS section_name, subjects.name AS subject_name FROM questionnaires LEFT JOIN sections ON questionnaires.section_id=sections.id LEFT JOIN subjects ON questionnaires.subject_id=subjects.id WHERE questionnaires.user_id=? ORDER BY questionnaires.title ASC`;
    let params = [userQ.id];
    if (req.query.section_id && req.query.subject_id) {
      query = `SELECT questionnaires.*, sections.name AS section_name, subjects.name AS subject_name FROM questionnaires LEFT JOIN sections ON questionnaires.section_id=sections.id LEFT JOIN subjects ON questionnaires.subject_id=subjects.id WHERE questionnaires.section_id=? AND questionnaires.subject_id=? AND questionnaires.user_id=? ORDER BY questionnaires.title ASC`;
      params = [req.query.section_id, req.query.subject_id, userQ.id];
    }
    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (err) { console.log(err); res.status(500).json({ error: 'Server error' }); }
});
app.get('/api/questionnaires/:id', async (req, res) => {
  try {
    const [rows] = await db.query(`SELECT questionnaires.*, sections.name AS section_name, subjects.name AS subject_name FROM questionnaires LEFT JOIN sections ON questionnaires.section_id=sections.id LEFT JOIN subjects ON questionnaires.subject_id=subjects.id WHERE questionnaires.id=?`, [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) { console.log(err); res.status(500).json({ error: 'Server error' }); }
});
app.post('/api/questionnaires', async (req, res) => {
  const user = getUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  const { title, type, section_id, subject_id, questions } = req.body;
  try {
    const [result] = await db.query('INSERT INTO questionnaires (title, type, section_id, subject_id, questions, user_id) VALUES (?,?,?,?,?,?)',
      [title, type, section_id, subject_id, questions, user.id]);
    await logActivity(user.id, user.fullname, 'CREATE_QUESTIONNAIRE', `Created: ${title}`, req.body.platform||'web');
    res.json({ message: 'Questionnaire created!', id: result.insertId });
  } catch (err) { console.log(err); res.status(500).json({ error: 'Server error' }); }
});
app.put('/api/questionnaires/:id', async (req, res) => {
  const user = getUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  const { title, type, section_id, subject_id, questions } = req.body;
  try {
    await db.query('UPDATE questionnaires SET title=?, type=?, section_id=?, subject_id=?, questions=? WHERE id=? AND user_id=?',
      [title, type, section_id, subject_id, questions, req.params.id, user.id]);
    await logActivity(user.id, user.fullname, 'UPDATE_QUESTIONNAIRE', `Updated: ${title}`, req.body.platform || 'web');
    res.json({ message: 'Questionnaire updated!' });
  } catch (err) { console.log(err); res.status(500).json({ error: 'Server error' }); }
});
app.delete('/api/questionnaires/:id', async (req, res) => {
  const user = getUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  try {
    await db.query('DELETE FROM questionnaires WHERE id=? AND user_id=?', [req.params.id, user.id]);
    await logActivity(user.id, user.fullname, 'DELETE_QUESTIONNAIRE', `Deleted ID: ${req.params.id}`, req.body?.platform || 'web');
    res.json({ message: 'Questionnaire deleted!' });
  } catch (err) { console.log(err); res.status(500).json({ error: 'Server error' }); }
});

// ===========================
// ANSWER KEYS ROUTES
// ===========================
app.get('/api/answerkeys', async (req, res) => {
  const user = getUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  try {
    let query = `SELECT answerkeys.*, sections.name AS section_name, subjects.name AS subject_name FROM answerkeys LEFT JOIN sections ON answerkeys.section_id=sections.id LEFT JOIN subjects ON answerkeys.subject_id=subjects.id WHERE answerkeys.user_id=? ORDER BY answerkeys.title ASC`;
    let params = [user.id];
    if (req.query.section_id && req.query.subject_id) {
      query = `SELECT answerkeys.*, sections.name AS section_name, subjects.name AS subject_name FROM answerkeys LEFT JOIN sections ON answerkeys.section_id=sections.id LEFT JOIN subjects ON answerkeys.subject_id=subjects.id WHERE answerkeys.section_id=? AND answerkeys.subject_id=? AND answerkeys.user_id=? ORDER BY answerkeys.title ASC`;
      params = [req.query.section_id, req.query.subject_id, user.id];
    }
    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (err) { console.log(err); res.status(500).json({ error: 'Server error' }); }
});
// Sync (create or update) an answer key tied to a specific questionnaire
// Run this SQL once: ALTER TABLE answerkeys ADD COLUMN questionnaire_id INT DEFAULT NULL;
//                    ALTER TABLE answerkeys ADD INDEX idx_questionnaire_id (questionnaire_id);
app.put('/api/answerkeys/sync/:questionnaire_id', async (req, res) => {
  const user = getUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  const { title, type, section_id, subject_id, answers } = req.body;
  try {
    const [existing] = await db.query(
      'SELECT id FROM answerkeys WHERE questionnaire_id=? AND user_id=?',
      [req.params.questionnaire_id, user.id]
    );
    if (existing.length) {
      await db.query(
        'UPDATE answerkeys SET title=?, type=?, section_id=?, subject_id=?, answers=? WHERE questionnaire_id=? AND user_id=?',
        [title, type, section_id, subject_id, answers, req.params.questionnaire_id, user.id]
      );
    } else {
      await db.query(
        'INSERT INTO answerkeys (title, type, section_id, subject_id, answers, user_id, questionnaire_id) VALUES (?,?,?,?,?,?,?)',
        [title, type, section_id, subject_id, answers, user.id, req.params.questionnaire_id]
      );
    }
    await logActivity(user.id, user.fullname, 'SYNC_ANSWERKEY', `Synced answer key: ${title}`, req.body.platform || 'web');
    res.json({ message: 'Answer key synced!' });
  } catch (err) { console.log(err); res.status(500).json({ error: 'Server error' }); }
});
app.post('/api/answerkeys', async (req, res) => {
  const user = getUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  if (user.role !== 'admin') return res.status(403).json({ error: 'Use the questionnaire editor to manage answer keys.' });
  const { title, type, section_id, subject_id, answers, questionnaire_id } = req.body;
  try {
    await db.query('INSERT INTO answerkeys (title, type, section_id, subject_id, answers, user_id, questionnaire_id) VALUES (?,?,?,?,?,?,?)',
      [title, type, section_id, subject_id, answers, user.id, questionnaire_id || null]);
    await logActivity(user.id, user.fullname, 'CREATE_ANSWERKEY', `Created: ${title}`, req.body.platform||'web');
    res.json({ message: 'Answer key created!' });
  } catch (err) { console.log(err); res.status(500).json({ error: 'Server error' }); }
});
app.put('/api/answerkeys/:id', async (req, res) => {
  const user = getUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  if (user.role !== 'admin') return res.status(403).json({ error: 'Only admin can edit answer keys directly.' });
  const { title, type, section_id, subject_id, answers } = req.body;
  try {
    await db.query('UPDATE answerkeys SET title=?, type=?, section_id=?, subject_id=?, answers=? WHERE id=?',
      [title, type, section_id, subject_id, answers, req.params.id]);
    await logActivity(user.id, user.fullname, 'UPDATE_ANSWERKEY', `Updated: ${title}`, 'web');
    res.json({ message: 'Answer key updated!' });
  } catch (err) { console.log(err); res.status(500).json({ error: 'Server error' }); }
});
app.delete('/api/answerkeys/:id', async (req, res) => {
  const user = getUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  try {
    await db.query('DELETE FROM answerkeys WHERE id=? AND user_id=?', [req.params.id, user.id]);
    res.json({ message: 'Answer key deleted!' });
  } catch (err) { console.log(err); res.status(500).json({ error: 'Server error' }); }
});

// ===========================
// RECORDS ROUTES
// ===========================
app.get('/api/records', async (req, res) => {
  const user = getUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  try {
    let query = `SELECT records.*, CONCAT(students.first_name,' ',students.last_name) AS student_name, students.student_id, sections.name AS section_name, subjects.name AS subject_name, answerkeys.title AS exam_title FROM records LEFT JOIN students ON records.student_id_fk=students.id LEFT JOIN sections ON records.section_id=sections.id LEFT JOIN subjects ON records.subject_id=subjects.id LEFT JOIN answerkeys ON records.answer_key_id=answerkeys.id WHERE records.user_id=? ORDER BY student_name ASC, records.created_at DESC`;
    let params = [user.id];
    if (req.query.section_id && req.query.subject_id) {
      query = `SELECT records.*, CONCAT(students.first_name,' ',students.last_name) AS student_name, students.student_id, sections.name AS section_name, subjects.name AS subject_name, answerkeys.title AS exam_title FROM records LEFT JOIN students ON records.student_id_fk=students.id LEFT JOIN sections ON records.section_id=sections.id LEFT JOIN subjects ON records.subject_id=subjects.id LEFT JOIN answerkeys ON records.answer_key_id=answerkeys.id WHERE records.section_id=? AND records.subject_id=? AND records.user_id=? ORDER BY student_name ASC, records.created_at DESC`;
      params = [req.query.section_id, req.query.subject_id, user.id];
    }
    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (err) { console.log(err); res.status(500).json({ error: 'Server error' }); }
});
app.post('/api/records', async (req, res) => {
  const user = getUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  const { student_id, section_id, subject_id, answer_key_id, score, total, percentage } = req.body;
  try {
    await db.query('INSERT INTO records (student_id_fk, section_id, subject_id, answer_key_id, score, total, percentage, user_id) VALUES (?,?,?,?,?,?,?,?)',
      [student_id, section_id, subject_id, answer_key_id, score, total, percentage, user.id]);
    await logActivity(user.id, user.fullname, 'SAVE_RECORD', `Saved record: ${score}/${total} (${percentage}%)`, req.body.platform||'app');
    res.json({ message: 'Record added!' });
  } catch (err) { console.log(err); res.status(500).json({ error: 'Server error' }); }
});
app.delete('/api/records/:id', async (req, res) => {
  const user = getUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  try {
    await db.query('DELETE FROM records WHERE id=? AND user_id=?', [req.params.id, user.id]);
    res.json({ message: 'Record deleted!' });
  } catch (err) { console.log(err); res.status(500).json({ error: 'Server error' }); }
});

// ===========================
// TEST BANK ROUTES
// Run once in MySQL to create the table:
// CREATE TABLE IF NOT EXISTS test_bank (
//   id INT AUTO_INCREMENT PRIMARY KEY,
//   subject_id INT NOT NULL,
//   topic VARCHAR(255) NOT NULL,
//   type ENUM('multiple_choice','true_false','identification','essay') NOT NULL,
//   question_text TEXT NOT NULL,
//   choices JSON DEFAULT NULL,
//   answer TEXT DEFAULT NULL,
//   status ENUM('pending','approved') DEFAULT 'pending',
//   suggested_by INT NOT NULL,
//   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
//   FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
// );
// ===========================

// List questions — admin sees all; teacher sees approved + own pending
app.get('/api/test-bank', async (req, res) => {
  const user = getUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const conditions = [];
    const params = [];
    if (user.role !== 'admin') {
      conditions.push("(tb.status='approved' OR tb.suggested_by=?)");
      params.push(user.id);
    }
    if (req.query.subject_id) { conditions.push('tb.subject_id=?'); params.push(req.query.subject_id); }
    if (req.query.topic)      { conditions.push('tb.topic=?');      params.push(req.query.topic); }
    if (req.query.status && user.role === 'admin') { conditions.push('tb.status=?'); params.push(req.query.status); }
    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    const [rows] = await db.query(
      `SELECT tb.*, s.name AS subject_name, u.fullname AS suggested_by_name
       FROM test_bank tb
       LEFT JOIN subjects s ON tb.subject_id=s.id
       LEFT JOIN users u ON tb.suggested_by=u.id
       ${where} ORDER BY tb.topic ASC, tb.created_at DESC`, params
    );
    res.json(rows);
  } catch (err) { console.log(err); res.status(500).json({ error: 'Server error' }); }
});

// Distinct approved topics for a subject (for import picker)
app.get('/api/test-bank/topics', async (req, res) => {
  const user = getUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  if (!req.query.subject_id) return res.status(400).json({ error: 'subject_id required' });
  try {
    const [rows] = await db.query(
      `SELECT topic, type, COUNT(*) AS count FROM test_bank
       WHERE subject_id=? AND status='approved'
       GROUP BY topic, type ORDER BY topic ASC`,
      [req.query.subject_id]
    );
    res.json(rows);
  } catch (err) { console.log(err); res.status(500).json({ error: 'Server error' }); }
});

// Create / suggest a question
app.post('/api/test-bank', async (req, res) => {
  const user = getUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  const { subject_id, topic, type, question_text, choices, answer } = req.body;
  if (!subject_id || !topic || !type || !question_text)
    return res.status(400).json({ error: 'subject_id, topic, type, and question_text are required' });
  try {
    const status = user.role === 'admin' ? 'approved' : 'pending';
    await db.query(
      'INSERT INTO test_bank (subject_id, topic, type, question_text, choices, answer, status, suggested_by) VALUES (?,?,?,?,?,?,?,?)',
      [subject_id, topic.trim(), type, question_text.trim(),
       choices ? JSON.stringify(choices) : null, answer || null, status, user.id]
    );
    await logActivity(user.id, user.fullname,
      user.role === 'admin' ? 'CREATE_TESTBANK' : 'SUGGEST_TESTBANK',
      `${type} question in topic "${topic}"`, req.body.platform || 'web');
    res.json({ message: user.role === 'admin' ? 'Question added to bank!' : 'Question submitted for review!' });
  } catch (err) { console.log(err); res.status(500).json({ error: 'Server error' }); }
});

// Approve a pending question (admin only)
app.put('/api/test-bank/:id/approve', requireAdmin, async (req, res) => {
  const user = getUser(req);
  try {
    await db.query('UPDATE test_bank SET status=? WHERE id=?', ['approved', req.params.id]);
    await logActivity(user.id, user.fullname, 'APPROVE_TESTBANK', `Approved question ID: ${req.params.id}`, 'web');
    res.json({ message: 'Question approved!' });
  } catch (err) { console.log(err); res.status(500).json({ error: 'Server error' }); }
});

// Edit a question (admin only)
app.put('/api/test-bank/:id', requireAdmin, async (req, res) => {
  const user = getUser(req);
  const { subject_id, topic, type, question_text, choices, answer, status } = req.body;
  try {
    await db.query(
      'UPDATE test_bank SET subject_id=?, topic=?, type=?, question_text=?, choices=?, answer=?, status=? WHERE id=?',
      [subject_id, topic, type, question_text,
       choices ? JSON.stringify(choices) : null, answer || null, status || 'approved', req.params.id]
    );
    await logActivity(user.id, user.fullname, 'UPDATE_TESTBANK', `Updated question ID: ${req.params.id}`, 'web');
    res.json({ message: 'Question updated!' });
  } catch (err) { console.log(err); res.status(500).json({ error: 'Server error' }); }
});

// Delete a question (admin only)
app.delete('/api/test-bank/:id', requireAdmin, async (req, res) => {
  const user = getUser(req);
  try {
    await db.query('DELETE FROM test_bank WHERE id=?', [req.params.id]);
    await logActivity(user.id, user.fullname, 'DELETE_TESTBANK', `Deleted question ID: ${req.params.id}`, 'web');
    res.json({ message: 'Question deleted!' });
  } catch (err) { console.log(err); res.status(500).json({ error: 'Server error' }); }
});

// ── Create archives table on first run if it doesn't exist ──
async function initDB() {
  try {
    await db.query(`CREATE TABLE IF NOT EXISTS archives (
      id            INT AUTO_INCREMENT PRIMARY KEY,
      table_name    VARCHAR(100) NOT NULL,
      item_id       INT NOT NULL,
      item_name     VARCHAR(255),
      item_data     LONGTEXT,
      reason        TEXT,
      deleted_by_id INT,
      deleted_by_name VARCHAR(255),
      deleted_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      expires_at    TIMESTAMP NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    console.log('DB ready: archives table exists');
  } catch (err) { console.log('DB init warning:', err.message); }
}

// Serve frontend static files
app.use(express.static(path.join(__dirname)));

initDB().then(() => {
  app.listen(3000, '0.0.0.0', () => console.log('Server running on http://localhost:3000'));
});