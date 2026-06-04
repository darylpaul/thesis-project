'use strict';

const API = window.API_URL || 'http://localhost:3000/api';
const token = localStorage.getItem('token');
const role  = localStorage.getItem('role') || 'teacher';
const isAdmin = role === 'admin';

let allQuestions = [];
let filtered     = [];
let subjects     = [];
let editingId    = null;

// ── Init ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  if (isAdmin) {
    document.getElementById('statusFilterGroup').style.display = '';
    document.getElementById('fStatusGroup').style.display = '';
    document.getElementById('btnSuggestLabel').textContent = 'Add Question';
    document.getElementById('pageSubtitle').textContent = 'Manage reusable exam questions — approve suggestions from teachers';
  }
  loadSubjects().then(() => loadQuestions());

  document.getElementById('btnSuggest').addEventListener('click', openSuggestModal);
});

// ── Data loaders ──────────────────────────────────────────
async function loadSubjects() {
  try {
    const res = await fetch(`${API}/subjects`, { headers: { Authorization: token } });
    subjects = await res.json();
    const sel  = document.getElementById('subjectFilter');
    const fSel = document.getElementById('fSubject');
    subjects.forEach(s => {
      sel.innerHTML  += `<option value="${s.id}">${escHtml(s.name)}</option>`;
      fSel.innerHTML += `<option value="${s.id}">${escHtml(s.name)}</option>`;
    });
  } catch {}
}

async function onSubjectChange() {
  const subjectId = document.getElementById('subjectFilter').value;
  const topicSel  = document.getElementById('topicFilter');
  topicSel.innerHTML = '<option value="">All Topics</option>';
  if (subjectId) {
    try {
      const res = await fetch(`${API}/test-bank/topics?subject_id=${subjectId}`, { headers: { Authorization: token } });
      const topics = await res.json();
      topics.forEach(t => {
        topicSel.innerHTML += `<option value="${escHtml(t.topic)}">${escHtml(t.topic)} (${typeLabel(t.type)}, ${t.count})</option>`;
      });
    } catch {}
  }
  applyFilters();
}

async function loadQuestions() {
  try {
    const res = await fetch(`${API}/test-bank`, { headers: { Authorization: token } });
    allQuestions = await res.json();
    checkPending();
    applyFilters();
  } catch { showToast('Could not load questions', 'error'); }
}

function checkPending() {
  if (!isAdmin) return;
  const pending = allQuestions.filter(q => q.status === 'pending').length;
  const alert   = document.getElementById('pendingAlert');
  if (pending > 0) {
    alert.style.display = 'flex';
    document.getElementById('pendingAlertText').textContent =
      `${pending} pending question${pending !== 1 ? 's' : ''} awaiting approval`;
  } else {
    alert.style.display = 'none';
  }
}

function showPending() {
  document.getElementById('statusFilter').value = 'pending';
  applyFilters();
}

// ── Filters ───────────────────────────────────────────────
function applyFilters() {
  const subjectId    = document.getElementById('subjectFilter').value;
  const topic        = document.getElementById('topicFilter').value;
  const type         = document.getElementById('typeFilter').value;
  const statusVal    = isAdmin ? document.getElementById('statusFilter').value : '';
  const searchQuery  = document.getElementById('searchInput').value.toLowerCase().trim();

  filtered = allQuestions.filter(q => {
    if (subjectId && String(q.subject_id) !== subjectId) return false;
    if (topic     && q.topic !== topic)                   return false;
    if (type      && q.type  !== type)                    return false;
    if (statusVal && q.status !== statusVal)              return false;
    if (searchQuery) {
      const haystack = `${q.question_text} ${q.topic} ${q.subject_name}`.toLowerCase();
      if (!haystack.includes(searchQuery)) return false;
    }
    return true;
  });

  renderQuestions();
}

function handleSearch(val) {
  document.getElementById('searchClear').style.display = val ? 'flex' : 'none';
  applyFilters();
}

function clearSearch() {
  document.getElementById('searchInput').value = '';
  document.getElementById('searchClear').style.display = 'none';
  applyFilters();
}

// ── Render ────────────────────────────────────────────────
function renderQuestions() {
  const listEl   = document.getElementById('tbList');
  const emptyEl  = document.getElementById('emptyState');
  const countEl  = document.getElementById('resultCount');

  if (!filtered.length) {
    listEl.style.display  = 'none';
    emptyEl.style.display = '';
    countEl.style.display = 'none';
    return;
  }

  emptyEl.style.display = 'none';
  listEl.style.display  = '';
  countEl.style.display = '';
  countEl.textContent   = `${filtered.length} question${filtered.length !== 1 ? 's' : ''}`;

  listEl.innerHTML = filtered.map((q, i) => createCard(q, i)).join('');
}

function createCard(q, i) {
  const isPending = q.status === 'pending';
  const typeIco   = { multiple_choice: '🅰️', true_false: '✅', identification: '🔍', essay: '✏️' };
  const typeCls   = { multiple_choice: 'mc', true_false: 'tf', identification: 'id', essay: 'essay' };
  const typeBdg   = { multiple_choice: 'badge-blue', true_false: 'badge-green', identification: 'badge-yellow', essay: 'badge-purple' };

  const adminBtns = isAdmin ? `
    ${isPending ? `<button class="btn-icon approve" title="Approve" onclick="approveQuestion(${q.id})">
      <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
    </button>` : ''}
    <button class="btn-icon edit" title="Edit" onclick="openEditModal(${q.id})">
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
    </button>
    <button class="btn-icon delete" title="Delete" onclick="deleteQuestion(${q.id})">
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
    </button>` : '';

  return `
  <div class="tb-card ${isPending ? 'pending-card' : ''}" style="animation-delay:${i * 0.03}s">
    <div class="tb-icon ${typeCls[q.type] || 'mc'}">${typeIco[q.type] || '❓'}</div>
    <div class="tb-body">
      <div class="tb-question">${escHtml(q.question_text)}</div>
      <div class="tb-badges">
        <span class="badge ${typeBdg[q.type] || 'badge-gray'}">${typeLabel(q.type)}</span>
        <span class="badge badge-gray">${escHtml(q.subject_name || '—')}</span>
        <span class="badge badge-orange">${escHtml(q.topic)}</span>
        ${isPending ? '<span class="badge badge-amber">⏳ Pending</span>' : ''}
        ${!isPending && isAdmin ? '<span class="badge badge-green">✓ Approved</span>' : ''}
      </div>
      <div class="tb-meta">By ${escHtml(q.suggested_by_name || 'Unknown')} · ${formatDate(q.created_at)}</div>
    </div>
    <div class="tb-actions">
      <button class="btn-icon view" title="View" onclick="openViewModal(${q.id})">
        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
      </button>
      ${adminBtns}
    </div>
  </div>`;
}

// ── Suggest / Edit modal ──────────────────────────────────
function openSuggestModal() {
  editingId = null;
  clearForm();
  document.getElementById('formTitle').textContent    = isAdmin ? 'Add Question to Bank' : 'Suggest a Question';
  document.getElementById('formSubtitle').textContent = isAdmin ? 'Question will be immediately approved.' : 'Submit for admin review.';
  document.getElementById('btnFormSave').textContent  = isAdmin ? 'Add to Bank' : 'Submit for Review';
  document.getElementById('fStatus').value = 'approved';
  document.getElementById('formOverlay').classList.add('open');
}

async function openEditModal(id) {
  const q = allQuestions.find(q => q.id === id);
  if (!q) return;
  editingId = id;
  clearForm();
  document.getElementById('formTitle').textContent    = 'Edit Question';
  document.getElementById('formSubtitle').textContent = 'Admin edit — changes are saved immediately.';
  document.getElementById('btnFormSave').textContent  = 'Save Changes';

  document.getElementById('fSubject').value = q.subject_id;
  document.getElementById('fTopic').value   = q.topic;
  document.getElementById('fType').value    = q.type;
  document.getElementById('fStatus').value  = q.status;
  document.getElementById('fText').value    = q.question_text;
  onFormTypeChange();

  let choices = {};
  try { choices = typeof q.choices === 'string' ? JSON.parse(q.choices) : (q.choices || {}); } catch {}

  if (q.type === 'multiple_choice') {
    document.getElementById('cA').value = choices.A || '';
    document.getElementById('cB').value = choices.B || '';
    document.getElementById('cC').value = choices.C || '';
    document.getElementById('cD').value = choices.D || '';
    document.getElementById('fAnswerMC').value = q.answer || '';
  } else if (q.type === 'true_false') {
    document.getElementById('fAnswerTF').value = q.answer || 'True';
  } else if (q.type === 'identification') {
    document.getElementById('fAnswerID').value = q.answer || '';
  }

  await populateFormTopics(q.subject_id);
  document.getElementById('formOverlay').classList.add('open');
}

function closeFormModal() {
  document.getElementById('formOverlay').classList.remove('open');
  editingId = null;
}

function clearForm() {
  ['fSubject','fTopic','fType','fText','fAnswerMC','fAnswerID'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = el.tagName === 'SELECT' ? el.options[0]?.value || '' : '';
  });
  document.getElementById('fAnswerTF').value = 'True';
  ['cA','cB','cC','cD'].forEach(id => { document.getElementById(id).value = ''; });
  onFormTypeChange();
}

function onFormTypeChange() {
  const type = document.getElementById('fType').value;
  document.getElementById('mcSection').style.display    = type === 'multiple_choice' ? '' : 'none';
  document.getElementById('tfSection').style.display    = type === 'true_false' ? '' : 'none';
  document.getElementById('idSection').style.display    = type === 'identification' ? '' : 'none';
  document.getElementById('essaySection').style.display = type === 'essay' ? '' : 'none';
}

async function onFormSubjectChange() {
  const subjectId = document.getElementById('fSubject').value;
  await populateFormTopics(subjectId);
}

async function populateFormTopics(subjectId) {
  const dl = document.getElementById('topicSuggestions');
  dl.innerHTML = '';
  if (!subjectId) return;
  try {
    const res = await fetch(`${API}/test-bank/topics?subject_id=${subjectId}`, { headers: { Authorization: token } });
    const topics = await res.json();
    topics.forEach(t => { dl.innerHTML += `<option value="${escHtml(t.topic)}">`; });
  } catch {}
}

async function saveQuestion() {
  const subject_id    = document.getElementById('fSubject').value;
  const topic         = document.getElementById('fTopic').value.trim();
  const type          = document.getElementById('fType').value;
  const question_text = document.getElementById('fText').value.trim();

  if (!subject_id)    { showToast('Please select a subject', 'error'); return; }
  if (!topic)         { showToast('Topic is required', 'error'); return; }
  if (!question_text) { showToast('Question text is required', 'error'); return; }

  let choices = null, answer = null;
  if (type === 'multiple_choice') {
    choices = {
      A: document.getElementById('cA').value.trim(),
      B: document.getElementById('cB').value.trim(),
      C: document.getElementById('cC').value.trim(),
      D: document.getElementById('cD').value.trim()
    };
    answer = document.getElementById('fAnswerMC').value;
  } else if (type === 'true_false') {
    answer = document.getElementById('fAnswerTF').value;
  } else if (type === 'identification') {
    answer = document.getElementById('fAnswerID').value.trim();
  }

  const status = document.getElementById('fStatus').value || 'pending';
  const body   = { subject_id, topic, type, question_text, choices, answer, ...(isAdmin ? { status } : {}) };

  const btn = document.getElementById('btnFormSave');
  btn.disabled = true;
  btn.textContent = 'Saving...';

  try {
    const url = editingId ? `${API}/test-bank/${editingId}` : `${API}/test-bank`;
    const method = editingId ? 'PUT' : 'POST';
    const res = await fetch(url, {
      method, headers: { 'Content-Type': 'application/json', Authorization: token },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error');
    showToast(data.message, 'success');
    closeFormModal();
    await loadQuestions();
  } catch (err) {
    showToast(err.message || 'Failed to save', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = editingId ? 'Save Changes' : (isAdmin ? 'Add to Bank' : 'Submit for Review');
  }
}

// ── View modal ────────────────────────────────────────────
function openViewModal(id) {
  const q = allQuestions.find(q => q.id === id);
  if (!q) return;

  document.getElementById('viewTitle').textContent = typeLabel(q.type) + ' Question';
  document.getElementById('viewMeta').innerHTML =
    `<span class="badge badge-orange" style="margin-right:6px;">${escHtml(q.topic)}</span>` +
    `<span class="badge badge-gray">${escHtml(q.subject_name || '—')}</span>`;

  let choices = {};
  try { choices = typeof q.choices === 'string' ? JSON.parse(q.choices) : (q.choices || {}); } catch {}

  let body = `<div class="view-question-text">${escHtml(q.question_text)}</div>`;

  if (q.type === 'multiple_choice') {
    body += `<div class="view-choices">` +
      ['A','B','C','D'].map(l => `
        <div class="view-choice-row ${q.answer === l ? 'correct' : ''}">
          <span class="vc-letter">${l}.</span>
          <span class="vc-text">${escHtml(choices[l] || '')}</span>
          ${q.answer === l ? '<span class="vc-check">✓ Key</span>' : ''}
        </div>`).join('') + `</div>`;
  } else if (q.type !== 'essay' && q.answer) {
    body += `<div class="view-answer-box">
      <div class="view-answer-label">Correct Answer</div>
      <div class="view-answer-val">${escHtml(q.answer)}</div>
    </div>`;
  } else if (q.type === 'essay') {
    body += `<div class="essay-note">✏️ &nbsp;Essay — manually graded, no answer key needed.</div>`;
  }

  document.getElementById('viewBody').innerHTML = body;
  document.getElementById('viewOverlay').classList.add('open');
}

function closeViewModal() {
  document.getElementById('viewOverlay').classList.remove('open');
}

// ── Admin actions ─────────────────────────────────────────
async function approveQuestion(id) {
  showConfirm({
    title: 'Approve Question',
    message: 'Approve this question and add it to the Test Bank?',
    confirmText: 'Approve',
    type: 'restore',
    onConfirm: async () => {
      try {
        const res = await fetch(`${API}/test-bank/${id}/approve`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: token }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        showToast('Question approved!', 'success');
        await loadQuestions();
      } catch (err) { showToast(err.message || 'Failed to approve', 'error'); }
    }
  });
}

async function deleteQuestion(id) {
  showConfirm({
    title: 'Delete Question',
    message: 'Permanently delete this question from the bank? This cannot be undone.',
    confirmText: 'Delete',
    type: 'danger',
    onConfirm: async () => {
      try {
        const res = await fetch(`${API}/test-bank/${id}`, {
          method: 'DELETE', headers: { Authorization: token }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        showToast('Question deleted', 'success');
        await loadQuestions();
      } catch (err) { showToast(err.message || 'Failed to delete', 'error'); }
    }
  });
}

// ── Helpers ───────────────────────────────────────────────
function typeLabel(type) {
  return { multiple_choice: 'Multiple Choice', true_false: 'True or False', identification: 'Identification', essay: 'Essay' }[type] || type;
}

function escHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function formatDate(dt) {
  if (!dt) return '';
  return new Date(dt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

let toastTimer;
function showToast(msg, type = 'success') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = `toast show ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.classList.remove('show'); }, 3000);
}
