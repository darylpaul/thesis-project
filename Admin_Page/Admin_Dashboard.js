const API = window.API_URL || 'http://localhost:3000/api';

function escHtml(str) {
  return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Auth guard ──
const adminToken = localStorage.getItem('adminToken');
const adminName  = localStorage.getItem('adminName');
if (!adminToken) { window.location.href = '../Admin_Page/Admin_Login.html'; }

document.getElementById('adminName').textContent = adminName || 'Admin';
document.getElementById('logoutBtn').addEventListener('click', () => {
  localStorage.removeItem('adminToken');
  localStorage.removeItem('adminName');
  window.location.href = '../Admin_Page/Admin_Login.html';
});

const headers = { 'Authorization': adminToken, 'Content-Type': 'application/json' };

// ── Tabs ──
document.querySelectorAll('.sidebar-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.sidebar-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
    if (btn.dataset.tab === 'teachers') loadTeachers();
    if (btn.dataset.tab === 'logs')     loadAllLogs();
    if (btn.dataset.tab === 'archive')  loadArchive();
    if (btn.dataset.tab === 'subjects') loadSubjects();
  });
});

// ── Load on start ──
loadStats();
loadRecentLogs();

// ═══════════════════════════════════════
// SUBJECTS
// ═══════════════════════════════════════
let editingSubjectId = null;

function filterSubjects() {
  const q     = (document.getElementById('subjectSearch')?.value || '').toLowerCase();
  const rows  = document.querySelectorAll('#subjectsBody tr');
  rows.forEach(row => {
    row.style.display = row.textContent.toLowerCase().includes(q) ? '' : 'none';
  });
}

async function loadSubjects() {
  try {
    const res  = await fetch(`${API}/subjects`, { headers });
    const data = await res.json();
    const tbody = document.getElementById('subjectsBody');
    if (!data.length) {
      tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:32px;color:#9ca3af;">No subjects yet. Click + Add Subject to create one.</td></tr>`;
      return;
    }
    tbody.innerHTML = data.map((s, i) => `
      <tr>
        <td style="color:#9ca3af;font-weight:700;">${i+1}</td>
        <td style="font-weight:700;color:#1e2d6b;">${escHtml(s.name)}</td>
        <td><span style="background:#f3f4f6;color:#374151;padding:2px 10px;border-radius:12px;font-size:12px;font-weight:600;">${escHtml(s.code||'—')}</span></td>
        <td>
          <div style="display:flex;gap:6px;">
            <button onclick="openEditSubject(${s.id},'${escHtml(s.name)}','${escHtml(s.code||'')}')"
              style="padding:5px 12px;background:#eff2ff;color:#1a2eaa;border:1.5px solid #c7d2fe;
              border-radius:7px;font-size:12px;font-weight:700;cursor:pointer;">
              ✏️ Edit
            </button>
            <button onclick="deleteSubject(${s.id},'${escHtml(s.name)}')"
              style="padding:5px 12px;background:#fef2f2;color:#dc2626;border:1.5px solid #fecaca;
              border-radius:7px;font-size:12px;font-weight:700;cursor:pointer;">
              🗑 Delete
            </button>
          </div>
        </td>
      </tr>`).join('');
  } catch { showToast('Could not load subjects.', 'error'); }
}

document.getElementById('addSubjectBtn').addEventListener('click', () => {
  editingSubjectId = null;
  document.getElementById('subjectModalTitle').textContent = 'Add Subject';
  document.getElementById('subjectName').value  = '';
  document.getElementById('subjectCode').value  = '';
  document.getElementById('subjectError').textContent = '';
  document.getElementById('subjectOverlay').style.display = 'flex';
  setTimeout(() => document.getElementById('subjectName').focus(), 100);
});

function openEditSubject(id, name, code) {
  editingSubjectId = id;
  document.getElementById('subjectModalTitle').textContent = 'Edit Subject';
  document.getElementById('subjectName').value  = name;
  document.getElementById('subjectCode').value  = code;
  document.getElementById('subjectError').textContent = '';
  document.getElementById('subjectOverlay').style.display = 'flex';
}

function closeSubjectModal() {
  document.getElementById('subjectOverlay').style.display = 'none';
  editingSubjectId = null;
}

document.getElementById('subjectSaveBtn').addEventListener('click', async () => {
  const name  = document.getElementById('subjectName').value.trim();
  const code  = document.getElementById('subjectCode').value.trim();
  const errEl = document.getElementById('subjectError');
  if (!name) { errEl.textContent = 'Subject name is required.'; return; }

  const url    = editingSubjectId ? `${API}/subjects/${editingSubjectId}` : `${API}/subjects`;
  const method = editingSubjectId ? 'PUT' : 'POST';

  try {
    const res  = await fetch(url, { method, headers, body: JSON.stringify({ name, code }) });
    const data = await res.json();
    if (res.ok) {
      closeSubjectModal();
      loadSubjects();
      showToast(editingSubjectId ? 'Subject updated!' : 'Subject added!', 'success');
    } else { errEl.textContent = data.error || 'Could not save subject.'; }
  } catch { errEl.textContent = 'Server error.'; }
});

async function deleteSubject(id, name) {
  if (!confirm(`Delete subject "${name}"?`)) return;
  try {
    const res = await fetch(`${API}/subjects/${id}`, { method: 'DELETE', headers });
    if (res.ok) { showToast(`"${name}" deleted.`, 'success'); loadSubjects(); }
    else showToast('Could not delete subject.', 'error');
  } catch { showToast('Server error.', 'error'); }
}

// ═══════════════════════════════════════
// ARCHIVE
// ═══════════════════════════════════════
let allArchiveData = [];

async function loadArchive() {
  const list = document.getElementById('archiveList');
  list.innerHTML = '<div style="text-align:center;padding:24px;color:#9ca3af;">Loading archives...</div>';
  try {
    const res  = await fetch(`${API}/archives`, { headers });
    const data = await res.json();
    allArchiveData = data;
    renderArchive(data);
  } catch {
    list.innerHTML = '<div style="text-align:center;padding:24px;color:#dc2626;">Could not load archive.</div>';
  }
}

function filterArchive() {
  const type   = document.getElementById('archiveFilter').value;
  const search = (document.getElementById('archiveSearch')?.value || '').toLowerCase();
  let filtered = allArchiveData;
  if (type)   filtered = filtered.filter(a => a.table_name === type);
  if (search) filtered = filtered.filter(a =>
    (a.item_name||'').toLowerCase().includes(search) ||
    (a.deleted_by_name||'').toLowerCase().includes(search) ||
    (a.reason||'').toLowerCase().includes(search)
  );
  renderArchive(filtered);
}

function renderArchive(data) {
  const list = document.getElementById('archiveList');
  if (!data.length) {
    list.innerHTML = `
      <div style="text-align:center;padding:48px 24px;color:#9ca3af;">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" stroke-width="1.5" style="margin:0 auto 12px;display:block;">
          <polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/>
          <line x1="10" y1="12" x2="14" y2="12"/>
        </svg>
        <div style="font-size:15px;font-weight:700;margin-bottom:4px;">No archived items</div>
        <div style="font-size:13px;">Deleted items will appear here</div>
      </div>`;
    return;
  }

  const tableLabels = {
    sections:'Section', students:'Student', subjects:'Subject',
    questionnaires:'Questionnaire', answerkeys:'Answer Key',
    records:'Exam Record', users:'Teacher'
  };

  const tagColors = {
    sections:'#eff6ff;color:#2563eb', students:'#f0fdf4;color:#16a34a',
    subjects:'#faf5ff;color:#7c3aed', questionnaires:'#fff7ed;color:#ea580c',
    answerkeys:'#fef9ec;color:#ca8a04', records:'#f0f9ff;color:#0284c7',
    users:'#fef2f2;color:#dc2626'
  };

  list.innerHTML = `
    <div class="table-wrap">
      <table class="admin-table">
        <thead>
          <tr>
            <th>Type</th>
            <th>Item Name</th>
            <th>Deleted By</th>
            <th>Reason</th>
            <th>Date Deleted</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${data.map(a => {
            const date     = new Date(a.deleted_at).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });
            const label    = tableLabels[a.table_name] || a.table_name;
            const tagStyle = tagColors[a.table_name] || '#f3f4f6;color:#374151';
            return `
              <tr>
                <td>
                  <span style="background:${tagStyle.split(';')[0].replace('background:','')};${tagStyle.split(';')[1]};
                    font-size:11px;font-weight:700;padding:3px 10px;border-radius:12px;white-space:nowrap;">
                    ${label}
                  </span>
                </td>
                <td style="font-weight:700;color:#111827;">${escHtml(a.item_name)}</td>
                <td style="color:#374151;">${escHtml(a.deleted_by_name)}</td>
                <td>
                  <span style="background:#fef9ec;border:1px solid #fde68a;border-radius:6px;
                    padding:3px 8px;font-size:12px;color:#92400e;display:inline-block;max-width:200px;
                    white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${escHtml(a.reason)}">
                    ${escHtml(a.reason)}
                  </span>
                </td>
                <td style="color:#6b7280;font-size:13px;">${date}</td>
                <td>
                  <div style="display:flex;gap:6px;">
                    <button onclick="restoreArchive(${a.id})"
                      style="padding:5px 12px;background:#f0fdf4;color:#16a34a;border:1.5px solid #bbf7d0;
                      border-radius:7px;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap;">
                      ↩ Restore
                    </button>
                    <button onclick="permanentDelete(${a.id}, '${escHtml(a.item_name)}')"
                      style="padding:5px 12px;background:#fef2f2;color:#dc2626;border:1.5px solid #fecaca;
                      border-radius:7px;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap;">
                      🗑 Forever
                    </button>
                  </div>
                </td>
              </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
    <div style="padding:12px 16px;font-size:12px;color:#9ca3af;border-top:1px solid #f1f5f9;">
      Showing ${data.length} archived item${data.length !== 1 ? 's' : ''}
    </div>`;
}

let pendingRestoreId      = null;
let pendingPermanentId    = null;

function restoreArchive(id) {
  const item = allArchiveData.find(a => a.id === id);
  pendingRestoreId = id;
  document.getElementById('restoreArchiveName').textContent = item ? item.item_name : 'this item';
  document.getElementById('restoreArchiveOverlay').style.display = 'flex';
}

function permanentDelete(id, name) {
  pendingPermanentId = id;
  document.getElementById('permanentDeleteName').textContent = name;
  document.getElementById('permanentDeleteOverlay').style.display = 'flex';
}

document.getElementById('restoreArchiveCancelBtn').addEventListener('click', () => {
  document.getElementById('restoreArchiveOverlay').style.display = 'none';
  pendingRestoreId = null;
});

document.getElementById('restoreArchiveConfirmBtn').addEventListener('click', async () => {
  if (!pendingRestoreId) return;
  document.getElementById('restoreArchiveOverlay').style.display = 'none';
  try {
    const res = await fetch(`${API}/archives/${pendingRestoreId}/restore`, { method: 'POST', headers });
    if (res.ok) { showToast('Item restored successfully!', 'success'); loadArchive(); }
    else showToast('Could not restore item.', 'error');
  } catch { showToast('Server error.', 'error'); }
  pendingRestoreId = null;
});

document.getElementById('permanentDeleteCancelBtn').addEventListener('click', () => {
  document.getElementById('permanentDeleteOverlay').style.display = 'none';
  pendingPermanentId = null;
});

document.getElementById('permanentDeleteConfirmBtn').addEventListener('click', async () => {
  if (!pendingPermanentId) return;
  document.getElementById('permanentDeleteOverlay').style.display = 'none';
  try {
    const res = await fetch(`${API}/archives/${pendingPermanentId}`, { method: 'DELETE', headers });
    if (res.ok) { showToast('Permanently deleted.', 'success'); loadArchive(); }
    else showToast('Could not delete.', 'error');
  } catch { showToast('Server error.', 'error'); }
  pendingPermanentId = null;
});

// ═══════════════════════════════════════
// STATS
// ═══════════════════════════════════════
async function loadStats() {
  try {
    const res  = await fetch(`${API}/admin/stats`, { headers });
    const data = await res.json();
    document.getElementById('stat-teachers').textContent       = data.teachers;
    document.getElementById('stat-questionnaires').textContent = data.questionnaires;
    document.getElementById('stat-answerkeys').textContent     = data.answerkeys;
    document.getElementById('stat-records').textContent        = data.records;
    document.getElementById('stat-sections').textContent       = data.sections;
    document.getElementById('stat-students').textContent       = data.students;
  } catch { console.error('Could not load stats'); }
}

// ═══════════════════════════════════════
// RECENT LOGS
// ═══════════════════════════════════════
async function loadRecentLogs() {
  try {
    const res  = await fetch(`${API}/admin/logs`, { headers });
    const logs = await res.json();
    renderLogs(document.getElementById('recentLogs'), logs.slice(0, 20));
  } catch { document.getElementById('recentLogs').innerHTML = '<p class="empty-msg">Could not load logs.</p>'; }
}

// ═══════════════════════════════════════
// ALL LOGS
// ═══════════════════════════════════════
let allLogsData = [];

async function loadAllLogs() {
  try {
    const res  = await fetch(`${API}/admin/logs`, { headers });
    allLogsData = await res.json();
    filterLogs();
  } catch { document.getElementById('allLogs').innerHTML = '<p class="empty-msg">Could not load logs.</p>'; }
}

function filterLogs() {
  const action   = document.getElementById('logsFilter').value;
  const platform = document.getElementById('platformFilter').value;
  const search   = (document.getElementById('logsSearch')?.value || '').toLowerCase().trim();
  let filtered   = allLogsData;
  if (action)   filtered = filtered.filter(l => l.action === action);
  if (platform) filtered = filtered.filter(l => l.platform === platform);
  if (search)   filtered = filtered.filter(l =>
    (l.user_name||'').toLowerCase().includes(search) ||
    (l.action||'').toLowerCase().includes(search) ||
    (l.details||'').toLowerCase().includes(search)
  );
  renderLogs(document.getElementById('allLogs'), filtered);
}

document.getElementById('logsFilter').addEventListener('change', filterLogs);
document.getElementById('platformFilter').addEventListener('change', filterLogs);
document.getElementById('refreshLogs').addEventListener('click', loadAllLogs);

function renderLogs(container, logs) {
  if (!logs.length) { container.innerHTML = '<p class="empty-msg">No activity logs found.</p>'; return; }
  const actionColors = {
    'LOGIN':                { bg:'#eff6ff', color:'#2563eb', icon:'🔐' },
    'CREATE_QUESTIONNAIRE': { bg:'#f0fdf4', color:'#16a34a', icon:'📄' },
    'UPDATE_QUESTIONNAIRE': { bg:'#fefce8', color:'#ca8a04', icon:'✏️' },
    'DELETE_QUESTIONNAIRE': { bg:'#fef2f2', color:'#dc2626', icon:'🗑️' },
    'CREATE_ANSWERKEY':     { bg:'#f5f3ff', color:'#7c3aed', icon:'🔑' },
    'SAVE_RECORD':          { bg:'#f0fdf4', color:'#16a34a', icon:'💾' },
    'CREATE_STUDENT':       { bg:'#eff6ff', color:'#2563eb', icon:'👨‍🎓' },
    'CREATE_SECTION':       { bg:'#fff7ed', color:'#ea580c', icon:'🏫' },
    'CREATE_SUBJECT':       { bg:'#f5f3ff', color:'#7c3aed', icon:'📚' },
  };
  container.innerHTML = logs.map(log => {
    const s    = actionColors[log.action] || { bg:'#f3f4f6', color:'#6b7280', icon:'📋' };
    const time = new Date(log.created_at).toLocaleString();
    const plat = log.platform === 'app' ? '📱 App' : '💻 Web';
    return `
      <div class="log-item">
        <div class="log-icon" style="background:${s.bg};color:${s.color};">${s.icon}</div>
        <div class="log-info">
          <div class="log-action" style="color:${s.color};">${log.action.replace(/_/g,' ')}</div>
          <div class="log-detail">${log.details || ''}</div>
          <div class="log-meta">
            <span class="log-teacher">👤 ${log.user_name || 'Unknown'}</span>
            <span class="log-platform">${plat}</span>
            <span class="log-time">🕐 ${time}</span>
          </div>
        </div>
      </div>`;
  }).join('');
}

// ═══════════════════════════════════════
// TEACHERS LIST
// ═══════════════════════════════════════
let teachersData = [];

async function loadTeachers() {
  try {
    const res  = await fetch(`${API}/admin/teachers`, { headers });
    teachersData = await res.json();
    renderTeachers(teachersData);
  } catch { document.getElementById('teachersBody').innerHTML = '<tr><td colspan="7">Could not load teachers.</td></tr>'; }
}

document.getElementById('teacherSearch').addEventListener('input', function() {
  const q = this.value.toLowerCase();
  renderTeachers(teachersData.filter(t =>
    t.fullname.toLowerCase().includes(q) || t.email.toLowerCase().includes(q)
  ));
});

function renderTeachers(teachers) {
  const tbody = document.getElementById('teachersBody');
  if (!teachers.length) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#9ca3af;padding:32px;">No teachers found.</td></tr>';
    return;
  }
  tbody.innerHTML = teachers.map(t => `
    <tr>
      <td><div class="teacher-name">${t.fullname}</div></td>
      <td><div class="teacher-email">${t.email}</div></td>
      <td><span class="count-badge purple">${t.questionnaire_count || 0}</span></td>
      <td><span class="count-badge green">${t.record_count || 0}</span></td>
      <td class="time-cell">${t.last_active ? new Date(t.last_active).toLocaleString() : 'Never'}</td>
      <td class="time-cell">${new Date(t.created_at).toLocaleDateString()}</td>
      <td class="actions-cell">
        <button class="btn-view-logs" onclick="viewTeacherLogs(${t.id}, '${t.fullname}')">📋 Logs</button>
        <button class="btn-reset" onclick="openResetModal(${t.id}, '${t.fullname}')">🔑 Reset</button>
        <button class="btn-del" onclick="openDeleteModal(${t.id}, '${t.fullname}')">🗑️</button>
      </td>
    </tr>`).join('');
}

function viewTeacherLogs(userId, name) {
  document.querySelector('[data-tab="logs"]').click();
  setTimeout(async () => {
    try {
      const res  = await fetch(`${API}/admin/logs?user_id=${userId}`, { headers });
      allLogsData = await res.json();
      document.getElementById('logsFilter').value    = '';
      document.getElementById('platformFilter').value = '';
      filterLogs();
    } catch {}
  }, 100);
}

// ═══════════════════════════════════════
// ADD TEACHER
// ═══════════════════════════════════════
const addTeacherOverlay = document.getElementById('addTeacherOverlay');

document.getElementById('addTeacherBtn').addEventListener('click', () => {
  document.getElementById('newTeacherFirstName').value = '';
  document.getElementById('newTeacherLastName').value  = '';
  document.getElementById('newTeacherGender').value    = '';
  document.getElementById('newTeacherEmail').value     = '';
  document.getElementById('newTeacherPassword').value  = '';
  document.getElementById('addTeacherError').textContent = '';
  addTeacherOverlay.style.display = 'flex';
});

document.getElementById('addTeacherCancelBtn').addEventListener('click', () => {
  addTeacherOverlay.style.display = 'none';
});

// ── Password strength validator ──
function validatePassword(password) {
  if (!password || password.length < 8)
    return 'Password must be at least 8 characters.';
  if (!/[A-Z]/.test(password))
    return 'Password must contain at least one uppercase letter (A-Z).';
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\|,.<>\/?]/.test(password))
    return 'Password must contain at least one special character (!@#$%).';
  return null;
}

// ── Password strength indicator ──
function getStrength(password) {
  let score = 0;
  if (password.length >= 8)                    score++;
  if (password.length >= 12)                   score++;
  if (/[A-Z]/.test(password))                  score++;
  if (/[a-z]/.test(password))                  score++;
  if (/[0-9]/.test(password))                  score++;
  if (/[!@#$%^&*()_+\-=\[\]{};:"\|,.<>\/?]/.test(password)) score++;
  if (score <= 2) return { label: 'Weak',   color: '#dc2626', width: '33%' };
  if (score <= 4) return { label: 'Medium', color: '#d97706', width: '66%' };
  return              { label: 'Strong',  color: '#16a34a', width: '100%' };
}

function updateStrength(inputId, wrapperId) {
  const val   = document.getElementById(inputId).value;
  const wrap  = document.getElementById(wrapperId);
  const bar   = document.getElementById(wrapperId + 'Bar');
  const label = document.getElementById(wrapperId + 'Label');

  if (!val) { wrap.style.display = 'none'; updateReqChecklist(''); return; }
  wrap.style.display = 'block';

  const s = getStrength(val);
  bar.style.width      = s.width;
  bar.style.background = s.color;
  label.textContent    = s.label;
  label.style.color    = s.color;

  // Only update checklist for the create teacher form
  if (inputId === 'newTeacherPassword') updateReqChecklist(val);
}

function updateReqChecklist(val) {
  const checks = {
    'req-length':  val.length >= 8,
    'req-upper':   /[A-Z]/.test(val),
    'req-special': /[!@#$%^&*()_+\-=\[\]{};':"\|,.<>\/?]/.test(val),
    'req-number':  /[0-9]/.test(val),
  };
  Object.entries(checks).forEach(([id, met]) => {
    const el   = document.getElementById(id);
    const icon = el?.querySelector('.req-icon');
    if (!el) return;
    if (met) {
      el.classList.add('met');
      if (icon) icon.textContent = '✓';
    } else {
      el.classList.remove('met');
      if (icon) icon.textContent = '○';
    }
  });
}

document.getElementById('addTeacherSaveBtn').addEventListener('click', async () => {
  const firstName = document.getElementById('newTeacherFirstName').value.trim();
  const lastName  = document.getElementById('newTeacherLastName').value.trim();
  const gender    = document.getElementById('newTeacherGender').value;
  const username  = document.getElementById('newTeacherEmail').value.trim().toLowerCase();
  const password  = document.getElementById('newTeacherPassword').value;
  const errEl     = document.getElementById('addTeacherError');

  if (!firstName)  { errEl.textContent = 'First name is required.'; return; }
  if (!lastName)   { errEl.textContent = 'Last name is required.'; return; }
  if (!gender)     { errEl.textContent = 'Please select a gender.'; return; }
  if (!username)   { errEl.textContent = 'Username is required.'; return; }
  if (/\s/.test(username)) { errEl.textContent = 'Username cannot contain spaces.'; return; }
  const pwErr = validatePassword(password);
  if (pwErr) { errEl.textContent = pwErr; return; }

  // Build full email with school domain
  const email    = `${username}@mindfulschool.com`;
  // Build fullname with title: e.g. "Ms. Maria Santos" or "Mr. Juan Dela Cruz"
  const title    = gender === 'female' ? 'Ms.' : 'Mr.';
  const fullname = `${title} ${firstName} ${lastName}`;

  errEl.textContent = '';
  document.getElementById('addTeacherSaveBtn').textContent = 'Creating...';
  document.getElementById('addTeacherSaveBtn').disabled    = true;

  try {
    const res  = await fetch(`${API}/admin/create-teacher`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ fullname, email, password })
    });
    const data = await res.json();

    if (res.ok) {
      addTeacherOverlay.style.display = 'none';
      loadTeachers();
      loadStats();
      alert(`✅ Teacher account created!\n\nName: ${fullname}\nEmail: ${email}\n\nPlease share the login credentials with the teacher privately.`);
    } else {
      errEl.textContent = data.error || 'Could not create account.';
    }
  } catch {
    errEl.textContent = 'Server error. Make sure the server is running.';
  }

  document.getElementById('addTeacherSaveBtn').textContent = 'Create Account';
  document.getElementById('addTeacherSaveBtn').disabled    = false;
});

// ═══════════════════════════════════════
// RESET PASSWORD
// ═══════════════════════════════════════
let resetTeacherId = null;
const resetOverlay = document.getElementById('resetOverlay');

function openResetModal(id, name) {
  resetTeacherId = id;
  document.getElementById('resetTeacherName').textContent = name;
  document.getElementById('newPassword').value = '';
  document.getElementById('resetError').textContent = '';
  resetOverlay.style.display = 'flex';
}

document.getElementById('resetCancelBtn').addEventListener('click', () => {
  resetOverlay.style.display = 'none';
});

document.getElementById('resetSaveBtn').addEventListener('click', async () => {
  const newPassword = document.getElementById('newPassword').value;
  const errEl       = document.getElementById('resetError');

  if (newPassword.length < 8) { errEl.textContent = 'Password must be at least 8 characters.'; return; }

  errEl.textContent = '';
  document.getElementById('resetSaveBtn').textContent = 'Resetting...';
  document.getElementById('resetSaveBtn').disabled    = true;

  try {
    const res  = await fetch(`${API}/admin/teachers/${resetTeacherId}/reset-password`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ password: newPassword })
    });
    const data = await res.json();

    if (res.ok) {
      resetOverlay.style.display = 'none';
      alert(`✅ Password reset successfully!\n\nPlease share the new password with the teacher privately.`);
    } else {
      errEl.textContent = data.error || 'Could not reset password.';
    }
  } catch {
    errEl.textContent = 'Server error.';
  }

  document.getElementById('resetSaveBtn').textContent = 'Reset Password';
  document.getElementById('resetSaveBtn').disabled    = false;
  resetTeacherId = null;
});

// ═══════════════════════════════════════
// DELETE TEACHER
// ═══════════════════════════════════════
let deleteTeacherId = null;
const deleteOverlay = document.getElementById('deleteOverlay');

function openDeleteModal(id, name) {
  deleteTeacherId = id;
  document.getElementById('deleteTeacherName').textContent = name;
  deleteOverlay.style.display = 'flex';
}

document.getElementById('deleteCancelBtn').addEventListener('click', () => {
  deleteOverlay.style.display = 'none';
});

document.getElementById('deleteConfirmBtn').addEventListener('click', async () => {
  if (!deleteTeacherId) return;
  try {
    const res = await fetch(`${API}/admin/teachers/${deleteTeacherId}`, { method: 'DELETE', headers });
    if (res.ok) {
      deleteOverlay.style.display = 'none';
      showToast('Teacher removed. Account saved in Archive — can be restored anytime.', 'success');
      loadTeachers();
      loadStats();
    } else {
      showToast('Could not remove teacher.', 'error');
    }
  } catch { showToast('Could not delete teacher.', 'error'); }
  deleteTeacherId = null;
});