const API = window.API_URL || 'http://localhost:3000/api';

let toastTimer;
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className   = `toast ${type} show`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3500);
}

function escHtml(str) {
  return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}


// ── Auth guard ──
const adminToken = localStorage.getItem('adminToken');
const adminName  = localStorage.getItem('adminName');
if (!adminToken) { window.location.href = '../Admin_Page/Admin_Login.html'; }

document.getElementById('adminName').textContent = adminName || 'Admin';
document.getElementById('logoutBtn').addEventListener('click', () => {
  document.getElementById('logoutModalOverlay').classList.add('open');
});
document.getElementById('logoutCancelBtn').addEventListener('click', () => {
  document.getElementById('logoutModalOverlay').classList.remove('open');
});
document.getElementById('logoutModalOverlay').addEventListener('click', e => {
  if (e.target === document.getElementById('logoutModalOverlay'))
    document.getElementById('logoutModalOverlay').classList.remove('open');
});
document.getElementById('logoutConfirmBtn').addEventListener('click', () => {
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
    if (btn.dataset.tab === 'teachers')    loadTeachers();
    if (btn.dataset.tab === 'sections')    loadAdminSections();
    if (btn.dataset.tab === 'subjects')    loadAdminSubjects();
    if (btn.dataset.tab === 'logs')        loadAllLogs();
    if (btn.dataset.tab === 'archive')     loadArchive();
    if (btn.dataset.tab === 'testbank')    loadQArchive();
    if (btn.dataset.tab === 'assignments') loadAssignments();
  });
});

// ── Load on start ──
loadStats();
loadRecentLogs();


// ═══════════════════════════════════════
// SUBJECTS
// ═══════════════════════════════════════
let allSubjectsData = [];
let editingSubjectId = null;

async function loadAdminSubjects() {
  document.getElementById('subjectsBody').innerHTML =
    '<tr><td colspan="3" style="text-align:center;padding:32px;color:#9ca3af;">Loading...</td></tr>';
  try {
    const res  = await fetch(`${API}/admin/subjects`, { headers });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `Server error (${res.status})`);
    allSubjectsData = Array.isArray(data) ? data : [];
    renderSubjects(allSubjectsData);
  } catch {
    document.getElementById('subjectsBody').innerHTML =
      '<tr><td colspan="3" style="text-align:center;padding:24px;color:#dc2626;">Could not load subjects.</td></tr>';
  }
}

function filterSubjects() {
  const q = (document.getElementById('subjectSearch')?.value || '').toLowerCase();
  const filtered = q
    ? allSubjectsData.filter(s =>
        (s.name||'').toLowerCase().includes(q) ||
        (s.code||'').toLowerCase().includes(q))
    : allSubjectsData;
  renderSubjects(filtered);
}

function renderSubjects(data) {
  const tbody = document.getElementById('subjectsBody');
  if (!data.length) {
    tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;padding:40px;color:#9ca3af;">No subjects yet. Add the first one!</td></tr>';
    return;
  }
  tbody.innerHTML = data.map(s => `
    <tr>
      <td><strong>${escHtml(s.name)}</strong></td>
      <td style="color:#6b7280;">${escHtml(s.code || '—')}</td>
      <td>
        <button onclick="openEditSubjectModal(${s.id}, '${escHtml(s.name)}', '${escHtml(s.code||'')}')"
          style="padding:5px 12px;background:#f0f4ff;color:#1a2eaa;border:none;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;margin-right:6px;">Edit</button>
        <button onclick="deleteSubject(${s.id}, '${escHtml(s.name)}')"
          style="padding:5px 12px;background:#fef2f2;color:#dc2626;border:none;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;">Delete</button>
      </td>
    </tr>`).join('');
}

function openAddSubjectModal() {
  editingSubjectId = null;
  document.getElementById('subjectModalTitle').textContent = 'Add Subject';
  document.getElementById('subjectNameInput').value = '';
  document.getElementById('subjectCodeInput').value = '';
  document.getElementById('subjectModalOverlay').style.display = 'flex';
}

function openEditSubjectModal(id, name, code) {
  editingSubjectId = id;
  document.getElementById('subjectModalTitle').textContent = 'Edit Subject';
  document.getElementById('subjectNameInput').value = name;
  document.getElementById('subjectCodeInput').value = code;
  document.getElementById('subjectModalOverlay').style.display = 'flex';
}

function closeSubjectModal() {
  document.getElementById('subjectModalOverlay').style.display = 'none';
}

async function saveSubject() {
  const name = document.getElementById('subjectNameInput').value.trim();
  const code = document.getElementById('subjectCodeInput').value.trim();
  if (!name) { showToast('Subject name is required', 'error'); return; }
  const btn = document.getElementById('saveSubjectBtn');
  btn.disabled = true; btn.textContent = 'Saving...';
  try {
    const url    = editingSubjectId ? `${API}/admin/subjects/${editingSubjectId}` : `${API}/admin/subjects`;
    const method = editingSubjectId ? 'PUT' : 'POST';
    const res = await fetch(url, { method, headers, body: JSON.stringify({ name, code }) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Could not save subject');
    closeSubjectModal();
    loadAdminSubjects();
    showToast(editingSubjectId ? 'Subject updated!' : 'Subject added!', 'success');
  } catch (err) {
    showToast(err.message || 'Could not save subject', 'error');
  } finally {
    btn.disabled = false; btn.textContent = 'Save';
  }
}

async function deleteSubject(id, name) {
  showConfirm({
    title: `Delete Subject`,
    message: `Delete "${name}"? This cannot be undone. Questionnaires linked to this subject will keep their reference.`,
    confirmText: 'Delete',
    type: 'danger',
    onConfirm: async () => {
      try {
        const res = await fetch(`${API}/admin/subjects/${id}`, { method: 'DELETE', headers });
        if (!res.ok) throw new Error();
        loadAdminSubjects();
        showToast('Subject deleted', 'success');
      } catch {
        showToast('Could not delete subject', 'error');
      }
    }
  });
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
    if (!res.ok) throw new Error(data.error || `Server error (${res.status})`);
    allArchiveData = Array.isArray(data) ? data : [];
    renderArchive(allArchiveData);
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
    const res  = await fetch(`${API}/archives/${pendingRestoreId}/restore`, {
      method: 'POST', headers, body: JSON.stringify({})
    });
    const text = await res.text();
    let data = {};
    try { data = JSON.parse(text); } catch { /* non-JSON response */ }
    if (res.ok) { showToast('Item restored successfully!', 'success'); loadArchive(); }
    else showToast(data.error || `Error ${res.status}`, 'error');
  } catch (err) { showToast('Network: ' + (err.message || 'unknown'), 'error'); }
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
    if (!res.ok) throw new Error(data.error || `Server error (${res.status})`);
    document.getElementById('stat-teachers').textContent           = data.teachers       ?? 0;
    document.getElementById('stat-questionnaires').textContent     = data.questionnaires  ?? 0;
    document.getElementById('stat-answerkeys').textContent         = data.answerkeys      ?? 0;
    document.getElementById('stat-records').textContent            = data.records         ?? 0;
    document.getElementById('stat-sections').textContent           = data.sections        ?? 0;
    document.getElementById('stat-students').textContent           = data.students        ?? 0;
    document.getElementById('stat-pending-testbank').textContent   = data.archived_exams  ?? 0;
  } catch { console.error('Could not load stats'); }
}

// ═══════════════════════════════════════
// RECENT LOGS
// ═══════════════════════════════════════
async function loadRecentLogs() {
  try {
    const res  = await fetch(`${API}/admin/logs`, { headers });
    const logs = await res.json();
    if (!res.ok) throw new Error(logs.error || `Server error (${res.status})`);
    renderLogs(document.getElementById('recentLogs'), (Array.isArray(logs) ? logs : []).slice(0, 20));
  } catch { document.getElementById('recentLogs').innerHTML = '<p class="empty-msg">Could not load logs.</p>'; }
}

// ═══════════════════════════════════════
// ALL LOGS
// ═══════════════════════════════════════
let allLogsData = [];

async function loadAllLogs() {
  try {
    const res  = await fetch(`${API}/admin/logs`, { headers });
    const logsData = await res.json();
    if (!res.ok) throw new Error(logsData.error || `Server error (${res.status})`);
    allLogsData = Array.isArray(logsData) ? logsData : [];
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
    'SUGGEST_TESTBANK':     { bg:'#fffbeb', color:'#d97706', icon:'💡' },
    'CREATE_TESTBANK':      { bg:'#f0fdf4', color:'#16a34a', icon:'🏦' },
    'APPROVE_TESTBANK':     { bg:'#f0fdf4', color:'#16a34a', icon:'✅' },
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
    const tData = await res.json();
    if (!res.ok) throw new Error(tData.error || `Server error (${res.status})`);
    teachersData = Array.isArray(tData) ? tData : [];
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
        <button class="btn-reassign" onclick="openReassignModal(${t.id}, '${escHtml(t.fullname)}')">🔄 Reassign</button>
        <button class="btn-del" onclick="openDeleteModal(${t.id}, '${t.fullname}')">🗑️</button>
      </td>
    </tr>`).join('');
}

function viewTeacherLogs(userId, name) {
  document.querySelector('[data-tab="logs"]').click();
  setTimeout(async () => {
    try {
      const res  = await fetch(`${API}/admin/logs?user_id=${userId}`, { headers });
      const tlData = await res.json();
      if (!res.ok) throw new Error(tlData.error || `Server error (${res.status})`);
      allLogsData = Array.isArray(tlData) ? tlData : [];
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
      document.getElementById('credName').textContent  = fullname;
      document.getElementById('credEmail').textContent = email;
      document.getElementById('credentialsOverlay').style.display = 'flex';
    } else {
      errEl.textContent = data.error || 'Could not create account.';
    }
  } catch {
    errEl.textContent = 'Server error. Make sure the server is running.';
  }

  document.getElementById('addTeacherSaveBtn').textContent = 'Create Account';
  document.getElementById('addTeacherSaveBtn').disabled    = false;
});

document.getElementById('credentialsDoneBtn').addEventListener('click', () => {
  document.getElementById('credentialsOverlay').style.display = 'none';
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
      showToast('Password reset successfully! Share the new password with the teacher.', 'success');
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

// ═══════════════════════════════════════
// REASSIGN TEACHER
// ═══════════════════════════════════════
let reassignFromId   = null;
let reassignFromName = '';

function openReassignModal(id, name) {
  reassignFromId   = id;
  reassignFromName = name;
  document.getElementById('reassignFromName').textContent = name;
  const sel = document.getElementById('reassignToTeacher');
  sel.innerHTML = '<option value="">Select replacement teacher...</option>' +
    teachersData
      .filter(t => t.id !== id)
      .map(t => `<option value="${t.id}">${escHtml(t.fullname)}</option>`)
      .join('');
  document.getElementById('reassignOverlay').style.display = 'flex';
}

document.getElementById('reassignCancelBtn').addEventListener('click', () => {
  document.getElementById('reassignOverlay').style.display = 'none';
  reassignFromId = null;
});

document.getElementById('reassignConfirmBtn').addEventListener('click', async () => {
  const newId = document.getElementById('reassignToTeacher').value;
  if (!newId) { showToast('Please select a replacement teacher.', 'error'); return; }
  const btn = document.getElementById('reassignConfirmBtn');
  btn.disabled = true; btn.textContent = 'Transferring...';
  try {
    const res  = await fetch(`${API}/admin/teachers/${reassignFromId}/reassign`, {
      method: 'PUT', headers, body: JSON.stringify({ new_teacher_id: newId })
    });
    const data = await res.json();
    if (res.ok) {
      document.getElementById('reassignOverlay').style.display = 'none';
      showToast(data.message || 'Reassigned successfully!', 'success');
      loadTeachers();
      loadAdminSections();
    } else {
      showToast(data.error || 'Could not reassign.', 'error');
    }
  } catch { showToast('Server error.', 'error'); }
  finally { btn.disabled = false; btn.textContent = 'Confirm Reassign'; reassignFromId = null; }
});

// ═══════════════════════════════════════
// TEST BANK / QUESTIONNAIRE ARCHIVE TAB
// ═══════════════════════════════════════
let allQArchiveData = [];

async function loadQArchive() {
  const list = document.getElementById('qArchiveList');
  if (!list) return;
  list.innerHTML = '<div style="text-align:center;padding:24px;color:#9ca3af;">Loading...</div>';
  try {
    const res = await fetch(`${API}/questionnaires/archived/list`, { headers });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `Server error (${res.status})`);
    allQArchiveData = Array.isArray(data) ? data : [];
    filterQArchive();
  } catch (err) {
    list.innerHTML = `<div style="text-align:center;padding:24px;color:#dc2626;">Could not load archive: ${err.message}</div>`;
  }
}

function filterQArchive() {
  const search = (document.getElementById('qArchiveSearch')?.value || '').toLowerCase();
  const kind   = document.getElementById('qArchiveKindFilter')?.value || '';
  const type   = document.getElementById('qArchiveTypeFilter')?.value || '';
  let filtered = Array.isArray(allQArchiveData) ? allQArchiveData : [];
  if (kind)   filtered = filtered.filter(q => q.item_type === kind);
  if (type)   filtered = filtered.filter(q => q.type === type);
  if (search) filtered = filtered.filter(q =>
    (q.title||'').toLowerCase().includes(search) ||
    (q.section_name||'').toLowerCase().includes(search) ||
    (q.subject_name||'').toLowerCase().includes(search) ||
    (q.archived_by_name||'').toLowerCase().includes(search)
  );
  renderQArchive(filtered);
}

function renderQArchive(data) {
  const list = document.getElementById('qArchiveList');
  if (!list) return;
  if (!data.length) {
    list.innerHTML = '<div style="text-align:center;padding:48px;color:#9ca3af;">No archived items found.</div>';
    return;
  }
  const typeColor = { Exam:'#f5f3ff;color:#7c3aed' };
  list.innerHTML = `
    <div class="table-wrap">
      <table class="admin-table">
        <thead>
          <tr><th>Kind</th><th>Title</th><th>Type</th><th>Section</th><th>Subject</th><th>Deleted By</th><th>Archived On</th><th>Actions</th></tr>
        </thead>
        <tbody>
          ${data.map(q => {
            const tc = typeColor[q.type] || '#f3f4f6;color:#374151';
            const archivedDate = q.archived_at ? new Date(q.archived_at).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : '—';
            const kindLabel = q.item_type === 'answerkey' ? 'Answer Key' : 'Questionnaire';
            const kindStyle = q.item_type === 'answerkey'
              ? 'background:#fef9ec;color:#ca8a04;border:1px solid #fde68a;'
              : 'background:#f0f4ff;color:#1a2eaa;border:1px solid #c7d2fe;';
            const safeTitle = escHtml(q.title).replace(/'/g, '&#39;');
            return `<tr>
              <td><span style="${kindStyle}font-size:11px;font-weight:700;padding:3px 8px;border-radius:12px;white-space:nowrap;">${kindLabel}</span></td>
              <td style="font-size:13px;font-weight:600;color:#111827;max-width:200px;">${escHtml(q.title)}</td>
              <td><span style="background:${tc.split(';')[0]};${tc.split(';')[1]};font-size:11px;font-weight:700;padding:3px 8px;border-radius:12px;">${escHtml(q.type||'—')}</span></td>
              <td style="font-size:13px;color:#374151;">${escHtml(q.section_name||'—')}</td>
              <td style="font-size:13px;color:#374151;">${escHtml(q.subject_name||'—')}</td>
              <td style="font-size:13px;color:#374151;">${escHtml(q.archived_by_name||'—')}</td>
              <td style="font-size:13px;color:#6b7280;">${archivedDate}</td>
              <td>
                <div style="display:flex;gap:6px;flex-wrap:wrap;">
                  ${q.item_type === 'questionnaire' ? `
                  <button onclick="archiveView(${q.id},'${q.item_type}')"
                    style="padding:5px 10px;background:#eff6ff;color:#2563eb;border:1.5px solid #bfdbfe;border-radius:7px;font-size:12px;font-weight:700;cursor:pointer;">
                    View
                  </button>` : ''}
                  <button onclick="archiveRestore(${q.id},'${q.item_type}','${safeTitle}')"
                    style="padding:5px 10px;background:#f0fdf4;color:#16a34a;border:1.5px solid #bbf7d0;border-radius:7px;font-size:12px;font-weight:700;cursor:pointer;">
                    Restore
                  </button>
                  <button onclick="archiveDelete(${q.id},'${q.item_type}','${safeTitle}')"
                    style="padding:5px 10px;background:#fef2f2;color:#dc2626;border:1.5px solid #fecaca;border-radius:7px;font-size:12px;font-weight:700;cursor:pointer;">
                    Delete
                  </button>
                </div>
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
    <div style="padding:12px 16px;font-size:12px;color:#9ca3af;border-top:1px solid #f1f5f9;">
      ${data.length} archived item${data.length !== 1 ? 's' : ''}
    </div>`;
}

const PART_LABELS_ADMIN = {
  multiple_choice: 'Letter Shading / Multiple Choice',
  true_false:      'True or False',
  identification:  'Identification',
  essay:           'Essay'
};

function toRomanAdmin(num) {
  const v=['M','CM','D','CD','C','XC','L','XL','X','IX','V','IV','I'];
  const n=[1000,900,500,400,100,90,50,40,10,9,5,4,1];
  let r=''; for(let i=0;i<n.length;i++) while(num>=n[i]){r+=v[i];num-=n[i];} return r;
}

function archiveView(id, itemType) {
  const q = allQArchiveData.find(x => x.id === id && x.item_type === itemType);
  if (!q) return;

  let parts = [];
  try {
    const p = JSON.parse(q.content);
    if (Array.isArray(p) && p[0] && p[0].questions) parts = p;
    else if (Array.isArray(p)) parts = [{ type:'multiple_choice', direction:'Choose the letter of the best answer.', questions: p.map(qt => ({ text:qt.text||'', choices:qt.choices||{A:'',B:'',C:'',D:''} })) }];
  } catch {}

  const totalItems = parts.reduce((t, p) => t + p.questions.length, 0);

  let partsHTML = '';
  let qNum = 1;
  parts.forEach((part, pi) => {
    partsHTML += `<div style="margin-bottom:20px;">
      <div style="display:flex;align-items:baseline;gap:8px;margin-bottom:4px;">
        <span style="font-weight:900;font-size:15px;color:#1a2eaa;">${toRomanAdmin(pi+1)}.</span>
        <span style="font-weight:800;font-size:14px;text-transform:uppercase;letter-spacing:0.5px;">${PART_LABELS_ADMIN[part.type]||part.type}</span>
      </div>
      ${part.direction ? `<div style="font-style:italic;font-size:12px;color:#6b7280;border-left:3px solid #c7d2fe;padding-left:8px;margin-bottom:10px;">${escHtml(part.direction)}</div>` : ''}`;

    part.questions.forEach(qt => {
      partsHTML += `<div style="margin-bottom:10px;">
        <div style="display:flex;gap:8px;align-items:flex-start;">
          <span style="font-weight:800;font-size:13px;min-width:24px;color:#1a2eaa;">${qNum}.</span>
          <div style="flex:1;">
            <div style="font-size:13px;color:#111827;margin-bottom:4px;">${escHtml(qt.text)}</div>`;

      if (part.type === 'multiple_choice') {
        const c = qt.choices || {};
        partsHTML += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:2px 16px;font-size:12px;color:#374151;margin-top:4px;">
          <span><strong>A.</strong> ${escHtml(c.A||'')}</span>
          <span><strong>B.</strong> ${escHtml(c.B||'')}</span>
          <span><strong>C.</strong> ${escHtml(c.C||'')}</span>
          <span><strong>D.</strong> ${escHtml(c.D||'')}</span>
        </div>`;
      }

      partsHTML += `</div></div></div>`;
      qNum++;
    });
    partsHTML += `</div>`;
  });

  const win = window.open('', '_blank');
  win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"/>
  <title>${escHtml(q.title)}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0;}
    body{font-family:Arial,sans-serif;background:#f3f4f6;color:#000;padding-top:52px;}
    #toolbar{position:fixed;top:0;left:0;right:0;height:52px;background:#1e2d6b;display:flex;align-items:center;padding:0 20px;gap:10px;z-index:100;}
    #toolbar span{flex:1;color:rgba(255,255,255,0.8);font-size:13px;font-weight:600;}
    #toolbar button{padding:7px 18px;border:none;border-radius:7px;font-size:13px;font-weight:700;cursor:pointer;}
    .btn-print{background:rgba(255,255,255,0.15);color:#fff;}
    .btn-print:hover{background:rgba(255,255,255,0.25);}
    #paper{background:#fff;max-width:820px;margin:20px auto;padding:32px 40px;box-shadow:0 2px 16px rgba(0,0,0,0.1);}
    .hdr{text-align:center;border-bottom:2.5px solid #1a2eaa;padding-bottom:12px;margin-bottom:16px;}
    .school{font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:1px;color:#1a2eaa;}
    .title{font-size:22px;font-weight:900;margin:6px 0 4px;}
    .badge{background:#1a2eaa;color:#fff;font-size:11px;font-weight:700;padding:2px 14px;border-radius:20px;display:inline-block;}
    .meta{font-size:12px;color:#6b7280;margin-top:4px;}
    .info-row{display:grid;grid-template-columns:2fr 1fr 1fr;gap:12px;margin-bottom:10px;font-size:12px;font-weight:700;}
    .info-field{display:flex;align-items:flex-end;gap:4px;}
    .info-line{flex:1;border-bottom:1.5px solid #000;height:16px;}
    @media print{#toolbar{display:none;}body{padding-top:0;background:#fff;}#paper{box-shadow:none;margin:0;padding:15mm;max-width:100%;}@page{size:A4;margin:10mm;}}
  </style></head><body>
  <div id="toolbar">
    <span>${escHtml(q.title)} — Test Bank Preview</span>
    <button class="btn-print" onclick="window.print()">🖨️ Print</button>
  </div>
  <div id="paper">
    <div class="hdr">
      <div class="school">Mindful School of Berlyn Achievers</div>
      <div class="title">${escHtml(q.title)}</div>
      <span class="badge">${escHtml(q.type||'Exam')}</span>
      <div class="meta">Total: ${totalItems} item${totalItems!==1?'s':''}</div>
    </div>
    <div class="info-row">
      <div class="info-field">Name: <div class="info-line"></div></div>
      <div class="info-field">Section: <strong>${escHtml(q.section_name||'—')}</strong></div>
      <div class="info-field">Date: <div class="info-line"></div></div>
    </div>
    <div style="margin-bottom:16px;font-size:12px;font-weight:700;">Subject: <span style="font-weight:400;">${escHtml(q.subject_name||'—')}</span></div>
    ${partsHTML || '<p style="color:#9ca3af;font-size:13px;">No questions available.</p>'}
    <div style="display:flex;justify-content:flex-end;margin-top:24px;">
      <div style="border:2.5px solid #1a2eaa;border-radius:8px;padding:8px 24px;text-align:center;min-width:120px;">
        <div style="font-size:9px;font-weight:700;color:#1a2eaa;letter-spacing:1.5px;text-transform:uppercase;">Score</div>
        <div style="font-size:20px;font-weight:900;margin-top:4px;">_____ / ${totalItems}</div>
      </div>
    </div>
  </div>
  </body></html>`);
  win.document.close();
}

async function archiveRestore(id, itemType, title) {
  const label = itemType === 'answerkey' ? 'answer key' : 'questionnaire';
  showConfirm({
    title: 'Restore Item',
    message: `Restore "${title}"? It will reappear in the teacher's ${label} list.`,
    confirmText: 'Restore',
    type: 'restore',
    onConfirm: async () => {
      const endpoint = itemType === 'answerkey'
        ? `${API}/answerkeys/${id}/restore`
        : `${API}/questionnaires/${id}/restore`;
      try {
        const res = await fetch(endpoint, { method: 'PUT', headers });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        showToast(`"${title}" restored successfully.`, 'success');
        loadQArchive(); loadStats();
      } catch (err) { showToast(err.message || 'Could not restore.', 'error'); }
    }
  });
}

async function archiveDelete(id, itemType, title) {
  showConfirm({
    title: 'Permanently Delete',
    message: `Permanently delete "${title}"? This cannot be undone.`,
    confirmText: 'Delete Forever',
    type: 'danger',
    onConfirm: async () => {
      const endpoint = itemType === 'answerkey'
        ? `${API}/answerkeys/${id}/permanent`
        : `${API}/questionnaires/${id}/permanent`;
      try {
        const res = await fetch(endpoint, { method: 'DELETE', headers });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        showToast(`"${title}" permanently deleted.`, 'success');
        loadQArchive(); loadStats();
      } catch (err) { showToast(err.message || 'Could not delete.', 'error'); }
    }
  });
}

function loadTestBank() { loadQArchive(); }

// ═══════════════════════════════════════
// SECTION ASSIGNMENTS
// ═══════════════════════════════════════
let allAssignments = [];

async function loadAssignments() {
  const list = document.getElementById('assignmentsList');
  if (!list) return;
  list.innerHTML = '<div style="text-align:center;padding:32px;color:#9ca3af;">Loading...</div>';
  try {
    // Load assignments + teachers + sections in parallel
    const [aRes, tRes, sRes] = await Promise.all([
      fetch(`${API}/admin/section-assignments`, { headers }),
      fetch(`${API}/admin/teachers`, { headers }),
      fetch(`${API}/admin/all-sections`, { headers })
    ]);
    allAssignments = await aRes.json();
    const teachers = await tRes.json();
    const sections = await sRes.json();

    // Populate teacher dropdown
    const tSel = document.getElementById('assignTeacher');
    tSel.innerHTML = '<option value="">Select teacher...</option>' +
      teachers.map(t => `<option value="${t.id}">${escHtml(t.fullname)}</option>`).join('');

    // Populate section dropdown
    const sSel = document.getElementById('assignSection');
    sSel.innerHTML = '<option value="">Select section...</option>' +
      sections.map(s => `<option value="${s.id}">${escHtml(s.name)} (${escHtml(s.grade||'')}) — Teacher: ${escHtml(s.adviser_name||'')}</option>`).join('');

    renderAssignments(allAssignments);
  } catch {
    list.innerHTML = '<div style="text-align:center;padding:32px;color:#dc2626;">Could not load assignments.</div>';
  }
}

async function onAssignTeacherChange() {
  const teacherId = document.getElementById('assignTeacher').value;
  const subSel    = document.getElementById('assignSubject');
  const hint      = document.getElementById('assignSubjectHint');
  subSel.innerHTML = '<option value="">Loading...</option>';
  if (!teacherId) {
    subSel.innerHTML = '<option value="">Select subject...</option>';
    hint.textContent = '(select teacher first)';
    return;
  }
  try {
    const res  = await fetch(`${API}/admin/subjects`, { headers });
    const subs = await res.json();
    hint.textContent = '';
    subSel.innerHTML = '<option value="">Select subject...</option>' +
      (subs.length
        ? subs.map(s => `<option value="${s.id}">${escHtml(s.name)}${s.code ? ' ('+escHtml(s.code)+')' : ''}</option>`).join('')
        : '<option value="" disabled>No subjects — add some in the Subjects tab first</option>');
  } catch {
    subSel.innerHTML = '<option value="">Could not load subjects</option>';
  }
}

async function doAddAssignment() {
  const teacherId = document.getElementById('assignTeacher').value;
  const sectionId = document.getElementById('assignSection').value;
  const subjectId = document.getElementById('assignSubject').value;
  if (!teacherId || !sectionId || !subjectId) {
    showToast('Please select a teacher, section, and subject.', 'error'); return;
  }
  try {
    const res  = await fetch(`${API}/admin/section-assignments`, {
      method: 'POST', headers,
      body: JSON.stringify({ teacher_id: teacherId, section_id: sectionId, subject_id: subjectId })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    showToast('Assignment created!', 'success');
    loadAssignments();
  } catch (err) { showToast(err.message || 'Could not create assignment.', 'error'); }
}

async function removeAssignment(id) {
  showConfirm({
    title: 'Remove Assignment',
    message: 'Remove this subject-teacher assignment? The teacher will no longer be assigned to this section for that subject.',
    confirmText: 'Remove',
    type: 'warning',
    onConfirm: async () => {
      try {
        const res = await fetch(`${API}/admin/section-assignments/${id}`, { method: 'DELETE', headers });
        if (!res.ok) throw new Error('Failed');
        showToast('Assignment removed.', 'success');
        loadAssignments();
      } catch { showToast('Could not remove assignment.', 'error'); }
    }
  });
}

function renderAssignments(data) {
  const list = document.getElementById('assignmentsList');
  if (!data.length) {
    list.innerHTML = `
      <div style="text-align:center;padding:48px;color:#9ca3af;">
        <div style="font-size:32px;margin-bottom:8px;">🔗</div>
        <div style="font-weight:700;margin-bottom:4px;">No assignments yet</div>
        <div style="font-size:13px;">Use the form above to assign subject teachers to sections</div>
      </div>`;
    return;
  }
  list.innerHTML = `
    <div class="table-wrap">
      <table class="admin-table">
        <thead>
          <tr><th>Teacher</th><th>Section</th><th>Grade</th><th>Subject</th><th>Assigned On</th><th>Actions</th></tr>
        </thead>
        <tbody>
          ${data.map(a => `
            <tr>
              <td style="font-weight:700;color:#1e3a5f;">${escHtml(a.teacher_name)}</td>
              <td style="color:#374151;">${escHtml(a.section_name)}</td>
              <td style="color:#6b7280;font-size:13px;">${escHtml(a.grade||'—')}</td>
              <td>
                <span style="background:#eff6ff;color:#2563eb;font-size:11px;font-weight:700;
                  padding:3px 10px;border-radius:12px;">
                  ${escHtml(a.subject_name||'—')}
                </span>
              </td>
              <td style="color:#6b7280;font-size:13px;">${new Date(a.created_at).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</td>
              <td>
                <button onclick="removeAssignment(${a.id})"
                  style="padding:5px 12px;background:#fef2f2;color:#dc2626;border:1.5px solid #fecaca;
                  border-radius:7px;font-size:12px;font-weight:700;cursor:pointer;">
                  ✕ Remove
                </button>
              </td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>
    <div style="padding:12px 16px;font-size:12px;color:#9ca3af;border-top:1px solid #f1f5f9;">
      ${data.length} assignment${data.length !== 1 ? 's' : ''}
    </div>`;
}

// ═══════════════════════════════════════════════════════
// ADMIN — SECTIONS MANAGEMENT
// ═══════════════════════════════════════════════════════
let allAdminSections = [];
let allAdminTeachers = [];
let editingSectionId = null;

async function loadAdminSections() {
  try {
    const [sRes, tRes] = await Promise.all([
      fetch(`${API}/admin/all-sections`, { headers }),
      fetch(`${API}/admin/teachers`,     { headers })
    ]);
    allAdminSections = await sRes.json();
    allAdminTeachers = await tRes.json();
    renderAdminSections(allAdminSections);
  } catch { showToast('Could not load sections.', 'error'); }
}

function filterAdminSections() {
  const q = document.getElementById('sectionSearch').value.toLowerCase();
  renderAdminSections(allAdminSections.filter(s =>
    (s.name||'').toLowerCase().includes(q) ||
    (s.grade||'').toLowerCase().includes(q) ||
    (s.adviser_name||s.adviser||'').toLowerCase().includes(q)
  ));
}

function renderAdminSections(sections) {
  const tbody = document.getElementById('adminSectionsBody');
  if (!sections.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#9ca3af;padding:24px;">No sections yet. Click "+ Add Section" to create one.</td></tr>';
    return;
  }
  tbody.innerHTML = sections.map(s => `
    <tr>
      <td style="font-weight:600;color:#1e3a5f;">${escHtml(s.name)}</td>
      <td style="color:#374151;">${escHtml(s.grade||'—')}</td>
      <td style="color:#374151;">${escHtml(s.adviser_name||s.adviser||'—')}</td>
      <td style="color:#374151;">${s.students_count ?? '—'}</td>
      <td>
        <button onclick="openEditSectionModal(${s.id})"
          style="padding:5px 12px;background:#eff6ff;color:#2563eb;border:1.5px solid #bfdbfe;border-radius:7px;font-size:12px;font-weight:700;cursor:pointer;margin-right:6px;">
          ✏️ Edit
        </button>
        <button onclick="deleteAdminSection(${s.id},'${escHtml(s.name)}')"
          style="padding:5px 12px;background:#fef2f2;color:#dc2626;border:1.5px solid #fecaca;border-radius:7px;font-size:12px;font-weight:700;cursor:pointer;">
          🗑 Delete
        </button>
      </td>
    </tr>`).join('');
}

function populateTeacherDropdown() {
  const sel = document.getElementById('secTeacherInput');
  sel.innerHTML = '<option value="">Select teacher...</option>' +
    allAdminTeachers.map(t => `<option value="${t.id}">${escHtml(t.fullname)}</option>`).join('');
}

function openAddSectionModal() {
  editingSectionId = null;
  document.getElementById('sectionModalTitle').textContent = 'Add Section';
  document.getElementById('secNameInput').value  = '';
  document.getElementById('secGradeInput').value = '';
  populateTeacherDropdown();
  document.getElementById('sectionModalOverlay').style.display = 'flex';
}

function openEditSectionModal(id) {
  const s = allAdminSections.find(x => x.id === id);
  if (!s) return;
  editingSectionId = id;
  document.getElementById('sectionModalTitle').textContent = 'Edit Section';
  document.getElementById('secNameInput').value  = s.name || '';
  document.getElementById('secGradeInput').value = s.grade || '';
  populateTeacherDropdown();
  document.getElementById('secTeacherInput').value = s.user_id || '';
  document.getElementById('sectionModalOverlay').style.display = 'flex';
}

function closeSectionModal() {
  document.getElementById('sectionModalOverlay').style.display = 'none';
}

async function saveAdminSection() {
  const name       = document.getElementById('secNameInput').value.trim();
  const grade      = document.getElementById('secGradeInput').value;
  const teacher_id = document.getElementById('secTeacherInput').value;
  if (!name)       { showToast('Section name is required.', 'error'); return; }
  if (!teacher_id) { showToast('Please select a teacher.', 'error'); return; }
  const btn = document.getElementById('saveSectionBtn');
  btn.disabled = true; btn.textContent = 'Saving...';
  try {
    const url    = editingSectionId ? `${API}/admin/sections/${editingSectionId}` : `${API}/admin/sections`;
    const method = editingSectionId ? 'PUT' : 'POST';
    const res    = await fetch(url, { method, headers, body: JSON.stringify({ name, grade, teacher_id }) });
    const data   = await res.json();
    if (!res.ok) { showToast(data.error || 'Error saving section.', 'error'); return; }
    showToast(editingSectionId ? 'Section updated!' : 'Section created!', 'success');
    closeSectionModal();
    loadAdminSections();
  } catch { showToast('Could not connect to server.', 'error'); }
  finally { btn.disabled = false; btn.textContent = 'Save'; }
}

async function deleteAdminSection(id, name) {
  showConfirm({
    title: 'Delete Section',
    message: `Delete "${name}"? This will also remove all students in this section.`,
    confirmText: 'Delete',
    type: 'danger',
    onConfirm: async () => {
      try {
        const res = await fetch(`${API}/admin/sections/${id}`, { method: 'DELETE', headers });
        if (res.ok) { showToast('Section deleted.', 'success'); loadAdminSections(); }
        else showToast('Could not delete section.', 'error');
      } catch { showToast('Could not connect to server.', 'error'); }
    }
  });
}