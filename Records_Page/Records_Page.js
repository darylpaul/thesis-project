const API = window.API_URL || 'http://localhost:3000/api';

// ===========================
// CONSTANTS
// ===========================
const AVATAR_COLORS = ['av-blue', 'av-green', 'av-purple', 'av-orange', 'av-pink'];

function avatarColor(i) { return AVATAR_COLORS[i % AVATAR_COLORS.length]; }

function getInitials(name) {
  const parts = (name || '').trim().split(/\s+/);
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : (parts[0] || '?')[0].toUpperCase();
}

function gradeInfo(pct) {
  if (pct >= 90) return { label: 'A',  badgeClass: 'badge-green',  barClass: 'high' };
  if (pct >= 80) return { label: 'B',  badgeClass: 'badge-blue',   barClass: 'high' };
  if (pct >= 70) return { label: 'C',  badgeClass: 'badge-yellow', barClass: 'mid'  };
  if (pct >= 60) return { label: 'D',  badgeClass: 'badge-orange', barClass: 'mid'  };
  return              { label: 'F',  badgeClass: 'badge-red',    barClass: 'low'  };
}

function escHtml(s) {
  return (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ===========================
// INIT
// ===========================
window.addEventListener('DOMContentLoaded', () => {
  populateFilters();
});

// ===========================
// POPULATE FILTER DROPDOWNS
// ===========================
async function populateFilters() {
  try {
    const [sectionsRes, subjectsRes] = await Promise.all([
      fetch(`${API}/sections`, { headers: { 'Authorization': localStorage.getItem('token') } }),
      fetch(`${API}/subjects`, { headers: { 'Authorization': localStorage.getItem('token') } })
    ]);

    const sections = await sectionsRes.json();
    const subjects  = await subjectsRes.json();

    const sf = document.getElementById('sectionFilter');
    sf.innerHTML = '<option value="" disabled hidden>Select Section</option>';
    sections.forEach(s => {
      const o = document.createElement('option');
      o.value = s.id; o.textContent = s.name;
      sf.appendChild(o);
    });

    const pf = document.getElementById('subjectFilter');
    pf.innerHTML = '<option value="" disabled hidden>Select Subject</option>';
    subjects.forEach(s => {
      const o = document.createElement('option');
      o.value = s.id; o.textContent = s.name;
      pf.appendChild(o);
    });

    setTimeout(renderRecords, 0);
  } catch (err) {
    showToast('Could not load filters.', 'error');
  }
}

document.getElementById('sectionFilter').addEventListener('change', renderRecords);
document.getElementById('subjectFilter').addEventListener('change', renderRecords);

// ===========================
// RENDER RECORDS
// ===========================
let allRecordsData = [];

async function renderRecords() {
  const sectionId   = document.getElementById('sectionFilter').value;
  const subjectId   = document.getElementById('subjectFilter').value;
  const promptState = document.getElementById('promptState');
  const emptyState  = document.getElementById('emptyState');
  const tableWrap   = document.getElementById('tableWrap');
  const exportBtn   = document.getElementById('exportBtn');

  if (!sectionId || !subjectId) {
    promptState.style.display = 'flex';
    emptyState.style.display  = 'none';
    tableWrap.style.display   = 'none';
    exportBtn.style.display   = 'none';
    document.getElementById('recordsSearchWrap').style.display = 'none';
    return;
  }
  promptState.style.display = 'none';
  document.getElementById('recordsSearchWrap').style.display = 'block';

  try {
    const res = await fetch(`${API}/records?section_id=${sectionId}&subject_id=${subjectId}`, {
      headers: { 'Authorization': localStorage.getItem('token') }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `Server error (${res.status})`);
    allRecordsData = Array.isArray(data) ? data : [];
    const q = document.getElementById('recordsSearch')?.value || '';
    displayRecords(q ? allRecordsData.filter(r =>
      (r.student_name||'').toLowerCase().includes(q.toLowerCase()) ||
      (r.student_id||'').toLowerCase().includes(q.toLowerCase())
    ) : allRecordsData);
  } catch (err) {
    showToast(err.message || 'Could not load records.', 'error');
  }
}

function displayRecords(records) {
  const emptyState    = document.getElementById('emptyState');
  const tableWrap     = document.getElementById('tableWrap');
  const exportBtn     = document.getElementById('exportBtn');
  const searchWrap    = document.getElementById('recordsSearchWrap');

  if (!records.length) {
    emptyState.style.display  = 'flex';
    tableWrap.style.display   = 'none';
    exportBtn.style.display   = 'none';
    return;
  }
  emptyState.style.display  = 'none';
  tableWrap.style.display   = 'block';
  exportBtn.style.display   = 'flex';
  renderSummary(records);
  renderTable(records);
}

function handleSearch(query) {
  const q = query.toLowerCase().trim();
  document.getElementById('recordsSearchClear').style.display = q ? 'block' : 'none';
  displayRecords(allRecordsData.filter(r =>
    (r.student_name||'').toLowerCase().includes(q) ||
    (r.student_id||'').toLowerCase().includes(q)
  ));
}

function clearSearch() {
  document.getElementById('recordsSearch').value = '';
  document.getElementById('recordsSearchClear').style.display = 'none';
  displayRecords(allRecordsData);
}

// ===========================
// SUMMARY CARDS
// ===========================
function renderSummary(records) {
  const total   = records.length;
  const avgRaw  = records.reduce((a, r) => a + (parseFloat(r.percentage) || 0), 0) / total;
  const avg     = isNaN(avgRaw) ? 0 : Math.round(avgRaw);
  const pcts    = records.map(r => parseFloat(r.percentage) || 0);
  const highest = pcts.length ? Math.max(...pcts) : 0;
  const lowest  = pcts.length ? Math.min(...pcts) : 0;
  const passing = records.filter(r => r.percentage >= 60).length;

  document.getElementById('summaryRow').innerHTML = `
    <div class="summary-card">
      <div class="summary-label">Total Students</div>
      <div class="summary-value">${total}</div>
      <div class="summary-sub">took the exam</div>
    </div>
    <div class="summary-card">
      <div class="summary-label">Class Average</div>
      <div class="summary-value">${avg}%</div>
      <div class="summary-sub">average score</div>
    </div>
    <div class="summary-card">
      <div class="summary-label">Highest Score</div>
      <div class="summary-value">${highest}%</div>
      <div class="summary-sub">top performer</div>
    </div>
    <div class="summary-card">
      <div class="summary-label">Passing Rate</div>
      <div class="summary-value">${Math.round((passing/total)*100)}%</div>
      <div class="summary-sub">${passing} of ${total} passed (60%+)</div>
    </div>
  `;
}

// ===========================
// TABLE ROWS
// ===========================
function renderTable(records) {
  const tbody = document.getElementById('recordsTableBody');
  tbody.innerHTML = '';

  records.forEach((r, i) => {
    const gi     = gradeInfo(r.percentage);
    const barPct = Math.min(r.percentage, 100);

    const tr = document.createElement('tr');
    tr.style.animationDelay = `${i * 0.035}s`;
    tr.innerHTML = `
      <td style="color:#9ca3af;font-weight:700;font-size:0.8rem">${i + 1}</td>
      <td>
        <div class="student-cell">
          <div class="student-avatar ${avatarColor(i)}">${getInitials(r.student_name)}</div>
          <span style="font-weight:600;color:#111827">${escHtml(r.student_name)}</span>
        </div>
      </td>
      <td><span class="badge badge-blue">${escHtml(r.student_id || '—')}</span></td>
      <td style="color:#374151;font-weight:600">${escHtml(r.exam_title || '—')}</td>
      <td>
        <div class="score-cell">
          <span style="font-weight:700;color:#1e2d6b">${r.score}/${r.total}</span>
          <div class="score-bar-wrap">
            <div class="score-bar ${gi.barClass}" style="width:${barPct}%"></div>
          </div>
        </div>
      </td>
      <td style="font-weight:700;color:#374151">${r.percentage}%</td>
      <td><span class="badge ${gi.badgeClass}">${gi.label}</span></td>
      <td style="color:#9ca3af;font-size:0.8rem">${new Date(r.created_at).toLocaleDateString()}</td>
      <td>
        <div class="action-btns">
          <button class="btn-icon view" title="View details">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none"
              viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          </button>
          <button class="btn-icon delete" title="Delete">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none"
              viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
              <path d="M10 11v6"/><path d="M14 11v6"/>
              <path d="M9 6V4h6v2"/>
            </svg>
          </button>
        </div>
      </td>
    `;

    tr.querySelector('.btn-icon.view').addEventListener('click',   () => openViewModal(r));
    tr.querySelector('.btn-icon.delete').addEventListener('click', () => openDeleteModal(r));
    tbody.appendChild(tr);
  });

  const footer = document.getElementById('tableFooter');
  const sectionText = document.getElementById('sectionFilter').options[document.getElementById('sectionFilter').selectedIndex].text;
  const subjectText = document.getElementById('subjectFilter').options[document.getElementById('subjectFilter').selectedIndex].text;
  footer.innerHTML = `
    <span>Showing ${records.length} record${records.length !== 1 ? 's' : ''}</span>
    <span style="color:#d1d5db">Section: ${escHtml(sectionText)} · Subject: ${escHtml(subjectText)}</span>
  `;
}

// ===========================
// VIEW MODAL
// ===========================
const viewOverlay = document.getElementById('viewOverlay');

function openViewModal(r) {
  const gi = gradeInfo(r.percentage);
  document.getElementById('viewTitle').textContent = r.student_name;
  document.getElementById('viewMeta').innerHTML =
    `${escHtml(r.section_name)} &nbsp;·&nbsp; ${escHtml(r.subject_name)} &nbsp;·&nbsp; ${new Date(r.created_at).toLocaleDateString()}`;

  const barColor = gi.barClass === 'high' ? '#16a34a' : gi.barClass === 'mid' ? '#ca8a04' : '#dc2626';

  document.getElementById('viewBody').innerHTML = `
    <div class="detail-grid">
      <div class="detail-item">
        <div class="detail-label">Student Name</div>
        <div class="detail-value">${escHtml(r.student_name)}</div>
      </div>
      <div class="detail-item">
        <div class="detail-label">Student ID</div>
        <div class="detail-value">${escHtml(r.student_id || '—')}</div>
      </div>
      <div class="detail-item">
        <div class="detail-label">Section</div>
        <div class="detail-value">${escHtml(r.section_name)}</div>
      </div>
      <div class="detail-item">
        <div class="detail-label">Subject</div>
        <div class="detail-value">${escHtml(r.subject_name)}</div>
      </div>
      <div class="detail-item">
        <div class="detail-label">Exam</div>
        <div class="detail-value">${escHtml(r.exam_title || '—')}</div>
      </div>
      <div class="detail-item">
        <div class="detail-label">Date</div>
        <div class="detail-value">${new Date(r.created_at).toLocaleDateString()}</div>
      </div>
      <div class="detail-item">
        <div class="detail-label">Raw Score</div>
        <div class="detail-value">${r.score} / ${r.total}</div>
      </div>
      <div class="detail-item">
        <div class="detail-label">Final Grade</div>
        <div class="detail-value"><span class="badge ${gi.badgeClass}">${gi.label}</span></div>
      </div>
    </div>
    <div class="score-visual">
      <div class="score-visual-label">Score Breakdown</div>
      <div class="score-visual-bar-wrap">
        <div class="score-visual-bar" style="width:${r.percentage}%;background:${barColor}"></div>
      </div>
      <div class="score-visual-pct" style="color:${barColor}">${r.percentage}%</div>
    </div>
  `;

  viewOverlay.classList.add('open');
}

document.getElementById('viewClose').addEventListener('click',    () => viewOverlay.classList.remove('open'));
document.getElementById('viewCloseBtn').addEventListener('click', () => viewOverlay.classList.remove('open'));
viewOverlay.addEventListener('click', e => { if (e.target === viewOverlay) viewOverlay.classList.remove('open'); });

// ===========================
// DELETE MODAL
// ===========================
let deleteRecord = null;
const deleteOverlay = document.getElementById('deleteOverlay');

function openDeleteModal(r) {
  deleteRecord = r;
  document.getElementById('deleteRecordName').textContent = r.student_name;
  deleteOverlay.classList.add('open');
}
function closeDeleteModal() { deleteOverlay.classList.remove('open'); }

document.getElementById('deleteClose').addEventListener('click',     closeDeleteModal);
document.getElementById('deleteCancelBtn').addEventListener('click', closeDeleteModal);
deleteOverlay.addEventListener('click', e => { if (e.target === deleteOverlay) closeDeleteModal(); });

document.getElementById('deleteConfirmBtn').addEventListener('click', () => {
  requireAuthThenDelete(
    (deleteRecord && deleteRecord.student_name ? deleteRecord.student_name : 'this record'),
    'records', deleteRecord && deleteRecord.id, deleteRecord,
    () => { showToast('Record archived.', 'success'); closeDeleteModal(); renderRecords(); }
  );
});

// ===========================
// EXPORT CSV
// ===========================
document.getElementById('exportBtn').addEventListener('click', async () => {
  const sectionId = document.getElementById('sectionFilter').value;
  const subjectId = document.getElementById('subjectFilter').value;

  try {
    const res = await fetch(`${API}/records?section_id=${sectionId}&subject_id=${subjectId}`, {
      headers: { 'Authorization': localStorage.getItem('token') }
    });
    const records = await res.json();

    if (records.length === 0) return;

    const sectionText = document.getElementById('sectionFilter').options[document.getElementById('sectionFilter').selectedIndex].text;
    const subjectText = document.getElementById('subjectFilter').options[document.getElementById('subjectFilter').selectedIndex].text;

    // Sort records alphabetically by student name
    const sorted = [...records].sort((a, b) =>
      (a.student_name || '').localeCompare(b.student_name || '')
    );

    const headers = ['#', 'Student Name', 'Student ID', 'Section', 'Subject', 'Exam', 'Score', 'Total', 'Percentage', 'Grade', 'Date'];
    const rows    = sorted.map((r, i) => [
      i + 1,
      `"${r.student_name}"`,
      r.student_id || '',
      `"${r.section_name}"`,
      `"${r.subject_name}"`,
      `"${r.exam_title || ''}"`,
      r.score,
      r.total,
      r.percentage + '%',
      gradeInfo(r.percentage).label,
      `"${new Date(r.created_at).toLocaleDateString()}"`,
    ]);

    const csv  = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `exam_records_${sectionText}_${subjectText}.csv`.replace(/\s+/g, '_');
    a.click();
    URL.revokeObjectURL(url);

    showToast('Records exported as CSV!', 'success');
  } catch (err) {
    showToast('Could not export records.', 'error');
  }
});

// ===========================
// TOAST
// ===========================
let toastTimer;
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className   = `toast ${type} show`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3000);
}

// ===========================
// KEYBOARD SHORTCUTS
// ===========================
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    viewOverlay.classList.remove('open');
    closeDeleteModal();
  }
});