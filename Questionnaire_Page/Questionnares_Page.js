const API = window.API_URL || 'http://localhost:3000/api';

// Decode current user ID from JWT so we know which questionnaires belong to us
function getCurrentUserId() {
  try {
    const token = localStorage.getItem('token');
    if (!token) return null;
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.id || null;
  } catch { return null; }
}
const currentUserId = getCurrentUserId();

window.addEventListener('DOMContentLoaded', () => { populateFilterDropdowns(); });

// ===========================
// DROPDOWNS
// ===========================
async function populateFilterDropdowns() {
  try {
    const [sRes, subRes] = await Promise.all([
      fetch(`${API}/sections`, { headers: { 'Authorization': localStorage.getItem('token') } }),
      fetch(`${API}/subjects`, { headers: { 'Authorization': localStorage.getItem('token') } })
    ]);
    const sections = await sRes.json();
    const subjects = await subRes.json();

    ['sectionFilter','qSection'].forEach(id => {
      const el = document.getElementById(id);
      el.innerHTML = '<option value="" disabled hidden>Select section</option>';
      sections.forEach(s => { const o = document.createElement('option'); o.value = s.id; o.textContent = s.name; el.appendChild(o); });
    });
    ['subjectFilter','qSubject'].forEach(id => {
      const el = document.getElementById(id);
      el.innerHTML = '<option value="" disabled hidden>Select subject</option>';
      subjects.forEach(s => { const o = document.createElement('option'); o.value = s.id; o.textContent = s.name; el.appendChild(o); });
    });
    // Wait one tick so the browser can restore form state before we render
    setTimeout(renderQuestionnaires, 0);
  } catch { showToast('Could not load data.', 'error'); }
}

document.getElementById('sectionFilter').addEventListener('change', renderQuestionnaires);
document.getElementById('subjectFilter').addEventListener('change', renderQuestionnaires);

// ===========================
// RENDER LIST
// ===========================
let allQuestionnairesData = [];

async function renderQuestionnaires() {
  const sectionId = document.getElementById('sectionFilter').value;
  const subjectId = document.getElementById('subjectFilter').value;
  const prompt    = document.getElementById('promptState');
  const empty     = document.getElementById('emptyState');
  const list      = document.getElementById('questionnairesList');
  list.innerHTML  = '';
  empty.style.display  = 'none';
  list.style.display   = 'none';

  // Show prompt when no section and no subject are selected
  if (!sectionId && !subjectId) {
    prompt.style.display = 'flex';
    allQuestionnairesData = [];
    return;
  }
  prompt.style.display = 'none';

  const params = new URLSearchParams();
  if (sectionId) params.append('section_id', sectionId);
  if (subjectId) params.append('subject_id', subjectId);
  const qs = params.toString();

  try {
    const res  = await fetch(`${API}/questionnaires${qs ? '?' + qs : ''}`, { headers: { 'Authorization': localStorage.getItem('token') } });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `Server error (${res.status})`);
    allQuestionnairesData = Array.isArray(data) ? data : [];
    // Reapply search if active
    const q = document.getElementById('searchInput')?.value || '';
    displayQuestionnaires(q ? allQuestionnairesData.filter(item =>
      (item.title||'').toLowerCase().includes(q.toLowerCase()) ||
      (item.type||'').toLowerCase().includes(q.toLowerCase())
    ) : allQuestionnairesData);
  } catch (err) { showToast(err.message || 'Could not load questionnaires.', 'error'); }
}

function displayQuestionnaires(data) {
  const empty = document.getElementById('emptyState');
  const list  = document.getElementById('questionnairesList');
  list.innerHTML = '';
  if (!data.length) { empty.style.display = 'flex'; list.style.display = 'none'; return; }
  empty.style.display = 'none'; list.style.display = 'flex';
  data.forEach((q, i) => list.appendChild(createQCard(q, i)));
}

function handleSearch(query) {
  const q = query.toLowerCase().trim();
  document.getElementById('searchClear').style.display = q ? 'block' : 'none';
  const filtered = allQuestionnairesData.filter(item =>
    (item.title||'').toLowerCase().includes(q) ||
    (item.type||'').toLowerCase().includes(q)
  );
  displayQuestionnaires(filtered);
}

function clearSearch() {
  document.getElementById('searchInput').value = '';
  document.getElementById('searchClear').style.display = 'none';
  displayQuestionnaires(allQuestionnairesData);
}

function getTotalQuestions(q) {
  try {
    const p = JSON.parse(q.questions);
    if (p[0] && p[0].questions) return p.reduce((t, pt) => t + pt.questions.length, 0);
    return p.length;
  } catch { return 0; }
}

function createQCard(q, i) {
  const card = document.createElement('div');
  card.className = 'q-card';
  card.style.animationDelay = `${i * 0.06}s`;
  const count = getTotalQuestions(q);

  card.innerHTML = `
    <div class="q-card-left">
      <div class="q-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
        </svg>
      </div>
      <div class="q-info">
        <div class="q-title">${q.title}</div>
        <div class="q-badges">
          <span class="badge badge-purple">${q.type}</span>
          <span class="badge badge-green">${q.subject_name}</span>
          <span class="badge badge-gray">${q.section_name}</span>
        </div>
        <div class="q-meta">${count} question${count !== 1 ? 's' : ''} · ${new Date(q.created_at).toLocaleDateString()}</div>
      </div>
    </div>
    <div class="q-card-right">
      <button class="btn-icon view" title="View">
        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
        </svg>
      </button>
      ${q.user_id == currentUserId ? `
      <button class="btn-icon edit-btn" title="Edit">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
      </button>` : ''}
      <button class="btn-icon duplicate-btn" title="Duplicate">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
        </svg>
      </button>
      <button class="btn-icon export-btn" title="Export JSON">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
      </button>
      ${q.user_id == currentUserId ? `
      <button class="btn-icon delete" title="Move to Archive">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
          <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
        </svg>
      </button>` : ''}
    </div>`;

  card.querySelector('.btn-icon.view').addEventListener('click',          () => openViewModal(q));
  card.querySelector('.btn-icon.duplicate-btn').addEventListener('click', () => duplicateQuestionnaire(q));
  card.querySelector('.btn-icon.export-btn').addEventListener('click',    () => exportJSON(q));
  card.querySelector('.btn-icon.edit-btn')?.addEventListener('click',     () => openEditModal(q));
  card.querySelector('.btn-icon.delete')?.addEventListener('click',       () => {
    requireAuthThenDelete(
      q.title || 'this questionnaire',
      'questionnaires', q.id, q,
      () => { showToast('Questionnaire deleted.', 'success'); renderQuestionnaires(); }
    );
  });
  return card;
}

// ===========================
// PARTS BUILDER
// ===========================
let parts = [];
const DEFAULT_DIRECTIONS = {
  multiple_choice: 'Choose the letter of the best answer.',
  true_false:      'Write TRUE if the statement is correct and FALSE if it is not.',
  identification:  'Identify what is being described. Write your answer on the blank provided.',
  essay:           'Answer the following questions in complete sentences.'
};
const PART_LABELS = {
  multiple_choice: '📝 Letter Shading / Multiple Choice',
  true_false:      '✅ True or False',
  identification:  '🔍 Identification',
  essay:           '✏️ Essay'
};

function newPart() { return { type: 'multiple_choice', direction: DEFAULT_DIRECTIONS['multiple_choice'], questions: [newQuestion()] }; }
function newQuestion() { return { text: '', answer: '', choices: { A: '', B: '', C: '', D: '' } }; }

function renderParts() {
  const container = document.getElementById('partsContainer');
  container.innerHTML = '';
  parts.forEach((part, pi) => {
    const div = document.createElement('div');
    div.className = 'part-card';
    div.innerHTML = `
      <div class="part-header">
        <span class="part-label">Part ${pi + 1}</span>
        ${parts.length > 1 ? `<button class="btn-remove-part" data-pi="${pi}">✕ Remove</button>` : ''}
      </div>
      <div class="form-group" style="margin-bottom:10px;">
        <label>Section Type</label>
        <select class="part-type-select" data-pi="${pi}">
          <option value="multiple_choice" ${part.type==='multiple_choice'?'selected':''}>Letter Shading / Multiple Choice</option>
          <option value="true_false"      ${part.type==='true_false'?'selected':''}>True or False</option>
          <option value="identification"  ${part.type==='identification'?'selected':''}>Identification</option>
          <option value="essay"           ${part.type==='essay'?'selected':''}>Essay</option>
        </select>
      </div>
      <div class="form-group" style="margin-bottom:12px;">
        <label>Direction / Instruction</label>
        <textarea class="part-direction" data-pi="${pi}" rows="2">${part.direction || ''}</textarea>
      </div>
      <div class="questions-section">
        <div class="questions-header">
          <span class="questions-title">Questions</span>
          <button class="btn-add-question" data-pi="${pi}">+ Add Question</button>
        </div>
        <div id="qlist_${pi}">
          ${part.questions.map((q, qi) => renderQuestionHTML(pi, qi, part.type, q)).join('')}
        </div>
      </div>`;
    container.appendChild(div);
  });

  container.querySelectorAll('.part-type-select').forEach(sel => {
    sel.addEventListener('change', e => {
      const pi = +e.target.dataset.pi;
      parts[pi].type = e.target.value;
      parts[pi].direction = DEFAULT_DIRECTIONS[e.target.value];
      parts[pi].questions.forEach(q => q.answer = '');
      renderParts();
    });
  });
  container.querySelectorAll('.part-direction').forEach(ta => {
    ta.addEventListener('input', e => { parts[+e.target.dataset.pi].direction = e.target.value; });
  });
  container.querySelectorAll('.btn-remove-part').forEach(btn => {
    btn.addEventListener('click', e => { parts.splice(+e.target.dataset.pi, 1); renderParts(); });
  });
  container.querySelectorAll('.btn-add-question').forEach(btn => {
    btn.addEventListener('click', e => { parts[+e.target.dataset.pi].questions.push(newQuestion()); renderParts(); });
  });
  container.querySelectorAll('.btn-remove-question').forEach(btn => {
    btn.addEventListener('click', e => {
      const pi = +e.target.dataset.pi, qi = +e.target.dataset.qi;
      if (parts[pi].questions.length > 1) {
        showConfirm({
          title: 'Remove Question',
          message: `Remove question ${qi + 1}? This cannot be undone.`,
          confirmText: 'Remove',
          type: 'danger',
          onConfirm: () => { parts[pi].questions.splice(qi, 1); renderParts(); }
        });
      } else showToast('Each part needs at least 1 question.', 'error');
    });
  });
  container.querySelectorAll('.q-text-input').forEach(inp => {
    inp.addEventListener('input', e => { parts[+e.target.dataset.pi].questions[+e.target.dataset.qi].text = e.target.value; });
  });
  container.querySelectorAll('.choice-input').forEach(inp => {
    inp.addEventListener('input', e => {
      const pi = +e.target.dataset.pi, qi = +e.target.dataset.qi, l = e.target.dataset.letter;
      if (!parts[pi].questions[qi].choices) parts[pi].questions[qi].choices = {};
      parts[pi].questions[qi].choices[l] = e.target.value;
    });
  });
  container.querySelectorAll('.choice-row-select').forEach(row => {
    row.addEventListener('click', e => {
      if (e.target.classList.contains('choice-input')) return;
      const pi = +row.dataset.pi, qi = +row.dataset.qi;
      parts[pi].questions[qi].answer = row.dataset.letter;
      renderParts();
    });
  });
  container.querySelectorAll('.tf-select-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      parts[+btn.dataset.pi].questions[+btn.dataset.qi].answer = btn.dataset.val;
      renderParts();
    });
  });
  container.querySelectorAll('.id-answer-input').forEach(inp => {
    inp.addEventListener('input', e => { parts[+e.target.dataset.pi].questions[+e.target.dataset.qi].answer = e.target.value; });
    inp.addEventListener('keydown', e => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      inp.style.borderColor = '#16a34a';
      inp.style.background  = '#f0fdf4';
      const msg = inp.parentElement.querySelector('.id-saved-msg');
      if (msg) { msg.style.opacity = '1'; setTimeout(() => { msg.style.opacity = '0'; inp.style.borderColor = ''; inp.style.background = ''; }, 1500); }
      const next = inp.closest('.question-card')?.nextElementSibling?.querySelector('.id-answer-input');
      if (next) setTimeout(() => next.focus(), 100);
    });
  });
}

function renderQuestionHTML(pi, qi, type, q) {
  const choices = q.choices || { A:'', B:'', C:'', D:'' };
  let answerHTML = '';
  if (type === 'multiple_choice') {
    answerHTML = `
      <div class="choices-builder">
        ${['A','B','C','D'].map(l => `
          <div class="choice-row-select ${q.answer===l?'correct-choice':''}" data-pi="${pi}" data-qi="${qi}" data-letter="${l}" title="Click to set as correct answer">
            <span class="choice-letter">${l}.</span>
            <input type="text" class="choice-input" data-pi="${pi}" data-qi="${qi}" data-letter="${l}"
              value="${escHtml(choices[l]||'')}" placeholder="Option ${l}" />
            ${q.answer===l ? '<span class="correct-check">✅ Correct</span>' : ''}
          </div>`).join('')}
      </div>
      <p class="answer-hint">Click a row to mark it as the correct answer</p>`;
  } else if (type === 'true_false') {
    answerHTML = `
      <div class="tf-selector">
        <button class="tf-select-btn ${q.answer==='True'?'selected':''}" data-pi="${pi}" data-qi="${qi}" data-val="True">✓ True</button>
        <button class="tf-select-btn ${q.answer==='False'?'selected':''}" data-pi="${pi}" data-qi="${qi}" data-val="False">✗ False</button>
      </div>`;
  } else if (type === 'identification') {
    answerHTML = `
      <div class="id-answer">
        <label style="font-size:0.78rem;font-weight:600;color:#374151;display:block;margin-bottom:4px;">Correct Answer <span style="font-size:0.72rem;color:#6b7280;font-weight:400;">(press Enter to confirm)</span></label>
        <div style="display:flex;gap:8px;align-items:center;">
          <input type="text" class="id-answer-input" data-pi="${pi}" data-qi="${qi}"
            value="${escHtml(q.answer||'')}" placeholder="Type the correct answer..." style="flex:1;" />
          <span class="id-saved-msg" style="font-size:0.78rem;font-weight:700;color:#16a34a;opacity:0;transition:opacity 0.3s;white-space:nowrap;">✓ Saved!</span>
        </div>
      </div>`;
  } else if (type === 'essay') {
    answerHTML = `<div class="essay-note">✏️ Essay — manually graded, no answer key needed.</div>`;
  }

  const indicator = type !== 'essay'
    ? (q.answer ? `<div class="answer-set">Answer: <strong>${q.answer}</strong></div>` : `<div class="answer-missing">⚠️ No answer set yet</div>`)
    : '';

  return `
    <div class="question-item">
      <div class="question-row">
        <span class="question-num">${qi + 1}.</span>
        <div class="question-inputs" style="flex:1;">
          <input type="text" class="q-text-input" data-pi="${pi}" data-qi="${qi}"
            value="${escHtml(q.text||'')}" placeholder="Enter question ${qi + 1}..." style="margin-bottom:8px;" />
          ${answerHTML}
          ${indicator}
        </div>
        <button class="btn-remove-question" data-pi="${pi}" data-qi="${qi}" title="Remove">✕</button>
      </div>
    </div>`;
}

// ===========================
// CREATE / EDIT MODAL
// ===========================
let editingId = null;
const modalOverlay = document.getElementById('modalOverlay');

function clearModal() {
  document.getElementById('qTitle').value = '';
  document.getElementById('qType').value  = 'Exam';
  document.getElementById('qSection').value = '';
  document.getElementById('qSubject').value = '';
  document.getElementById('qTitleError').textContent   = '';
  document.getElementById('qSectionError').textContent = '';
  document.getElementById('qSubjectError').textContent = '';
  parts = [newPart()];
  renderParts();
}

function openCreateModal(prefillParts = null) {
  editingId = null;
  document.getElementById('modalTitle').textContent = 'Create Questionnaire';
  clearModal();
  const sf = document.getElementById('sectionFilter').value;
  const pf = document.getElementById('subjectFilter').value;
  if (sf) document.getElementById('qSection').value = sf;
  if (pf) document.getElementById('qSubject').value = pf;
  if (prefillParts) { parts = prefillParts; renderParts(); showToast('Questions loaded! Set title, section & subject.', 'success'); }
  modalOverlay.classList.add('open');
  document.body.style.overflow = 'hidden';
  setTimeout(() => document.getElementById('qTitle').focus(), 100);
}

function openEditModal(q) {
  editingId = q.id;
  document.getElementById('modalTitle').textContent = 'Edit Questionnaire';
  clearModal();

  // Fill basic info
  document.getElementById('qTitle').value   = q.title;
  document.getElementById('qType').value    = q.type || 'Exam';
  document.getElementById('qSection').value = q.section_id;
  document.getElementById('qSubject').value = q.subject_id;

  // Parse and load parts
  try {
    const parsed = JSON.parse(q.questions);
    if (Array.isArray(parsed) && parsed[0] && parsed[0].questions) {
      parts = parsed;
    } else if (Array.isArray(parsed)) {
      // Old flat format
      parts = [{ type: 'multiple_choice', direction: DEFAULT_DIRECTIONS['multiple_choice'], questions: parsed.map(qt => ({ text: qt.text || '', answer: qt.answer || '', choices: qt.choices || { A:'', B:'', C:'', D:'' } })) }];
    }
  } catch { parts = [newPart()]; }

  renderParts();
  modalOverlay.classList.add('open');
  document.body.style.overflow = 'hidden';
  setTimeout(() => document.getElementById('qTitle').focus(), 100);
}

function closeModal() { modalOverlay.classList.remove('open'); document.body.style.overflow = ''; }

document.getElementById('createQuestionnaireBtn').addEventListener('click', () => openCreateModal());
document.getElementById('createFirstBtn').addEventListener('click', () => openCreateModal());
document.getElementById('modalClose').addEventListener('click', closeModal);
document.getElementById('modalCancel').addEventListener('click', closeModal);
// Outside click intentionally disabled — prevents accidental loss of questionnaire work
document.getElementById('addPartBtn').addEventListener('click', () => { parts.push(newPart()); renderParts(); });
document.getElementById('uploadInlineBtn').addEventListener('click', () => { closeModal(); openUploadModal(); });
document.getElementById('exportBtn').addEventListener('click', () => {
  const title = document.getElementById('qTitle').value.trim() || 'questionnaire';
  exportJSONData({ title, type: document.getElementById('qType').value, parts }, title);
});

document.getElementById('modalSave').addEventListener('click', async () => {
  const title     = document.getElementById('qTitle').value.trim();
  const sectionId = document.getElementById('qSection').value;
  const subjectId = document.getElementById('qSubject').value;
  let valid = true;

  if (!title)     { document.getElementById('qTitleError').textContent = 'Title is required.'; valid = false; }
  if (!sectionId) { document.getElementById('qSectionError').textContent = 'Please select a section.'; valid = false; }
  if (!subjectId) { document.getElementById('qSubjectError').textContent = 'Please select a subject.'; valid = false; }
  const hasEmptyQ = parts.some(p => p.questions.some(q => !q.text.trim()));
  if (hasEmptyQ) { showToast('Please fill in all question texts.', 'error'); valid = false; }
  if (!valid) return;

  const hasMissingAnswer = parts.filter(p => p.type !== 'essay').some(p => p.questions.some(q => !q.answer));
  if (hasMissingAnswer) {
    showConfirm({
      title: 'Missing Answers',
      message: 'Some questions have no answer set. Save anyway?',
      confirmText: 'Save Anyway',
      type: 'warning',
      onConfirm: () => doSaveQuestionnaire()
    });
    return;
  }

  await doSaveQuestionnaire();
});

async function doSaveQuestionnaire() {
  const title     = document.getElementById('qTitle').value.trim();
  const type      = document.getElementById('qType').value;
  const sectionId = document.getElementById('qSection').value;
  const subjectId = document.getElementById('qSubject').value;
  const payload   = { title, type, section_id: sectionId, subject_id: subjectId, questions: JSON.stringify(parts) };

  try {
    const url    = editingId ? `${API}/questionnaires/${editingId}` : `${API}/questionnaires`;
    const method = editingId ? 'PUT' : 'POST';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', 'Authorization': localStorage.getItem('token') },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      const saved = await res.json();
      const questionnaireId = editingId || saved.id;
      await autoSyncAnswerKey(questionnaireId, title, type, sectionId, subjectId);
      showToast(editingId ? 'Questionnaire updated! Answer key synced ✅' : 'Questionnaire saved! Answer key auto-generated ✅', 'success');
      closeModal();
      renderQuestionnaires();
    } else { showToast('Something went wrong.', 'error'); }
  } catch { showToast('Could not connect to server.', 'error'); }
}

async function autoSyncAnswerKey(questionnaireId, title, type, sectionId, subjectId) {
  const answers = [];
  parts.forEach(part => {
    if (part.type !== 'essay') {
      part.questions.forEach(q => { answers.push({ question: answers.length + 1, answer: q.answer || '?' }); });
    }
  });
  if (!answers.length) return;
  try {
    await fetch(`${API}/answerkeys/sync/${questionnaireId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': localStorage.getItem('token') },
      body: JSON.stringify({ title, type, section_id: sectionId, subject_id: subjectId, answers: JSON.stringify(answers) })
    });
  } catch (err) { console.error('Could not sync answer key', err); }
}

// ===========================
// UPLOAD MODAL
// ===========================
const uploadOverlay   = document.getElementById('uploadOverlay');
const uploadFileInput = document.getElementById('uploadFileInput');

function openUploadModal() { uploadOverlay.classList.add('open'); document.body.style.overflow = 'hidden'; }
function closeUploadModal() { uploadOverlay.classList.remove('open'); document.body.style.overflow = ''; }

document.getElementById('uploadQuestionnaireBtn').addEventListener('click', openUploadModal);
document.getElementById('uploadClose').addEventListener('click', closeUploadModal);
document.getElementById('uploadCancelBtn').addEventListener('click', closeUploadModal);
uploadOverlay.addEventListener('click', e => { if (e.target === uploadOverlay) closeUploadModal(); });
document.getElementById('browseBtn').addEventListener('click', () => uploadFileInput.click());
document.getElementById('uploadDropZone').addEventListener('click', () => uploadFileInput.click());

const dropZone = document.getElementById('uploadDropZone');
dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
dropZone.addEventListener('drop', e => { e.preventDefault(); dropZone.classList.remove('drag-over'); const f = e.dataTransfer.files[0]; if (f) handleFile(f); });
uploadFileInput.addEventListener('change', e => { const f = e.target.files[0]; if (f) handleFile(f); uploadFileInput.value = ''; });

function handleFile(file) {
  if (!file.name.endsWith('.json')) { showToast('Please upload a .json file only.', 'error'); return; }
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      let loadedParts = data.parts && Array.isArray(data.parts) ? data.parts
        : (Array.isArray(data) && data[0]?.questions ? data : null);
      if (!loadedParts) { showToast('Invalid file format.', 'error'); return; }
      closeUploadModal();
      openCreateModal(loadedParts);
      if (data.title) setTimeout(() => document.getElementById('qTitle').value = data.title + ' (Copy)', 200);
    } catch { showToast('Could not read file.', 'error'); }
  };
  reader.readAsText(file);
}

// ===========================
// VIEW MODAL
// ===========================
const viewOverlay = document.getElementById('viewOverlay');
let currentViewQ  = null;

function openViewModal(q) {
  currentViewQ = q;
  document.getElementById('viewTitle').textContent = q.title;
  document.getElementById('viewMeta').innerHTML = `${q.type} &nbsp;·&nbsp; ${q.section_name} &nbsp;·&nbsp; ${q.subject_name}`;
  const body = document.getElementById('viewBody');
  body.innerHTML = '';
  let parsed; try { parsed = JSON.parse(q.questions); } catch { parsed = []; }

  if (!parsed.length) { body.innerHTML = '<p style="color:#9ca3af;">No questions.</p>'; }
  else if (parsed[0]?.questions) {
    parsed.forEach(part => {
      const partDiv = document.createElement('div');
      partDiv.className = 'view-part';
      partDiv.innerHTML = `
        <div class="view-part-label">${PART_LABELS[part.type] || part.type}</div>
        ${part.direction ? `<div class="view-direction"><strong>Direction:</strong> ${escHtml(part.direction)}</div>` : ''}`;
      part.questions.forEach((qt, qi) => {
        const qDiv = document.createElement('div');
        qDiv.className = 'view-question-item';
        let extraHTML = '';
        if (part.type === 'multiple_choice') {
          const c = qt.choices || {};
          extraHTML = `<div class="view-choices-ocr">${['A','B','C','D'].map(l => `
            <div class="view-mc-row${qt.answer===l?' correct-answer':''}">
              <span class="view-mc-bubble${qt.answer===l?' filled':''}">${l}</span>
              <span class="view-mc-text">${escHtml(c[l]||'')}</span>
              ${qt.answer===l ? '<span class="correct-badge">✓ Key</span>' : ''}
            </div>`).join('')}</div>`;
        } else if (part.type === 'true_false') {
          extraHTML = `<div class="view-tf-bubbles">
            <div class="view-tf-opt">
              <span class="view-tf-bubble${qt.answer==='True'?' filled':''}"></span>
              <span class="view-tf-word${qt.answer==='True'?' selected':''}">True</span>
            </div>
            <div class="view-tf-opt">
              <span class="view-tf-bubble${qt.answer==='False'?' filled':''}"></span>
              <span class="view-tf-word${qt.answer==='False'?' selected':''}">False</span>
            </div>
          </div>`;
        } else if (part.type === 'identification') {
          extraHTML = `<div class="view-id-answer">Answer: <strong>${escHtml(qt.answer||'—')}</strong></div>`;
        } else if (part.type === 'essay') {
          extraHTML = `<div style="color:#9ca3af;font-size:0.78rem;">Manually graded</div>`;
        }
        qDiv.innerHTML = `
          <span class="view-qnum">${qi+1}.</span>
          <div class="view-qbody"><div class="view-qtext">${escHtml(qt.text)}</div>${extraHTML}</div>`;
        partDiv.appendChild(qDiv);
      });
      body.appendChild(partDiv);
    });
  } else {
    parsed.forEach((qt, i) => {
      const d = document.createElement('div');
      d.className = 'view-question-item';
      d.innerHTML = `<span class="view-qnum">${i+1}.</span><div class="view-qbody"><div class="view-qtext">${escHtml(qt.text)}</div></div>`;
      body.appendChild(d);
    });
  }
  viewOverlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

document.getElementById('exportViewBtn').addEventListener('click', () => {
  if (!currentViewQ) return;
  let parsed; try { parsed = JSON.parse(currentViewQ.questions); } catch { parsed = []; }
  exportJSONData({ title: currentViewQ.title, type: currentViewQ.type, parts: parsed }, currentViewQ.title);
});
document.getElementById('viewClose').addEventListener('click',    () => { viewOverlay.classList.remove('open'); document.body.style.overflow = ''; currentViewQ = null; });
document.getElementById('viewCloseBtn').addEventListener('click', () => { viewOverlay.classList.remove('open'); document.body.style.overflow = ''; currentViewQ = null; });
viewOverlay.addEventListener('click', e => { if (e.target === viewOverlay) { viewOverlay.classList.remove('open'); document.body.style.overflow = ''; currentViewQ = null; } });

// ===========================
// DELETE MODAL
// ===========================
// DUPLICATE
// ===========================
async function duplicateQuestionnaire(q) {
  showConfirm({
    title: 'Duplicate Questionnaire',
    message: `Duplicate "${q.title}"? A copy will be created in the same section and subject.`,
    confirmText: 'Duplicate',
    type: 'info',
    onConfirm: () => _doDuplicate(q)
  });
}
async function _doDuplicate(q) {
  try {
    const res = await fetch(`${API}/questionnaires/${q.id}/duplicate`, {
      method: 'POST',
      headers: { 'Authorization': localStorage.getItem('token') }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to duplicate');
    showToast(`"${q.title} (Copy)" created!`, 'success');
    renderQuestionnaires();
  } catch (err) {
    showToast(err.message || 'Could not duplicate.', 'error');
  }
}

// ===========================

// ===========================
// EXPORT
// ===========================
function exportJSON(q) {
  let parsed; try { parsed = JSON.parse(q.questions); } catch { parsed = []; }
  exportJSONData({ title: q.title, type: q.type, parts: parsed }, q.title);
  showToast('Exported!', 'success');
}
function exportJSONData(data, name) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `${(name||'questionnaire').replace(/\s+/g,'_')}.json`; a.click();
  URL.revokeObjectURL(url);
}

// ===========================
// HELPERS
// ===========================
function escHtml(str) {
  return (str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
let toastTimer;
function showToast(msg, type='success') {
  const t = document.getElementById('toast');
  t.textContent = msg; t.className = `toast ${type} show`;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 3500);
}
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeModal(); closeDeleteModal(); viewOverlay.classList.remove('open'); closeUploadModal(); closeSaveToBankModal(); document.body.style.overflow = ''; }
});

