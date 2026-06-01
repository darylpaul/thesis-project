const API = window.API_URL || 'http://localhost:3000/api';

window.addEventListener('DOMContentLoaded', () => {
  populateDropdowns();
});

// ===========================
// POPULATE DROPDOWNS
// ===========================
async function populateDropdowns() {
  try {
    const [sRes, subRes] = await Promise.all([
      fetch(`${API}/sections`, { headers: { 'Authorization': localStorage.getItem('token') } }),
      fetch(`${API}/subjects`, { headers: { 'Authorization': localStorage.getItem('token') } })
    ]);
    const sections = await sRes.json();
    const subjects = await subRes.json();

    const secEl = document.getElementById('sectionFilter');
    secEl.innerHTML = '<option value="" disabled hidden>Select section</option>';
    sections.forEach(s => { const o = document.createElement('option'); o.value = s.id; o.textContent = s.name; secEl.appendChild(o); });

    const subEl = document.getElementById('subjectFilter');
    subEl.innerHTML = '<option value="" disabled hidden>Select subject</option>';
    subjects.forEach(s => { const o = document.createElement('option'); o.value = s.id; o.textContent = s.name; subEl.appendChild(o); });

    setTimeout(renderAnswerKeys, 0);
  } catch (err) {
    showToast('Could not load data. Is the server running?', 'error');
  }
}

document.getElementById('sectionFilter').addEventListener('change', renderAnswerKeys);
document.getElementById('subjectFilter').addEventListener('change', renderAnswerKeys);

// ===========================
// RENDER ANSWER KEYS
// ===========================
let allAnswerKeysData = [];

async function renderAnswerKeys() {
  const sectionId   = document.getElementById('sectionFilter').value;
  const subjectId   = document.getElementById('subjectFilter').value;
  const promptState = document.getElementById('promptState');
  const emptyState  = document.getElementById('emptyState');
  const listEl      = document.getElementById('answerkeysList');
  listEl.innerHTML  = '';

  if (!sectionId || !subjectId) {
    promptState.style.display = 'flex';
    emptyState.style.display  = 'none';
    listEl.style.display      = 'none';
    return;
  }
  promptState.style.display = 'none';

  try {
    const res = await fetch(`${API}/answerkeys?section_id=${sectionId}&subject_id=${subjectId}`, {
      headers: { 'Authorization': localStorage.getItem('token') }
    });
    allAnswerKeysData = await res.json();
    const q = document.getElementById('searchInput')?.value || '';
    displayAnswerKeys(q ? allAnswerKeysData.filter(ak =>
      (ak.title||'').toLowerCase().includes(q.toLowerCase()) ||
      (ak.type||'').toLowerCase().includes(q.toLowerCase())
    ) : allAnswerKeysData);
  } catch {
    showToast('Could not load answer keys.', 'error');
  }
}

function displayAnswerKeys(data) {
  const emptyState = document.getElementById('emptyState');
  const listEl     = document.getElementById('answerkeysList');
  listEl.innerHTML = '';
  if (!data.length) { emptyState.style.display = 'flex'; listEl.style.display = 'none'; return; }
  emptyState.style.display = 'none'; listEl.style.display = 'flex';
  data.forEach((ak, i) => listEl.appendChild(createAKCard(ak, i)));
}

function handleSearch(query) {
  const q = query.toLowerCase().trim();
  document.getElementById('searchClear').style.display = q ? 'block' : 'none';
  displayAnswerKeys(allAnswerKeysData.filter(ak =>
    (ak.title||'').toLowerCase().includes(q) ||
    (ak.type||'').toLowerCase().includes(q)
  ));
}

function clearSearch() {
  document.getElementById('searchInput').value = '';
  document.getElementById('searchClear').style.display = 'none';
  displayAnswerKeys(allAnswerKeysData);
}

function createAKCard(ak, visIdx) {
  const card = document.createElement('div');
  card.className = 'ak-card';
  card.style.animationDelay = `${visIdx * 0.06}s`;

  const answers   = ak.answers ? JSON.parse(ak.answers) : [];
  const itemCount = answers.length;
  const createdAt = new Date(ak.created_at).toLocaleDateString();
  const typeColor = { Quiz:'badge-blue', Exam:'badge-purple', Activity:'badge-green', Seatwork:'badge-orange' };
  const badgeClass = typeColor[ak.type] || 'badge-gray';

  card.innerHTML = `
    <div class="ak-card-left">
      <div class="ak-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <polyline points="9 15 11 17 15 13"/>
        </svg>
      </div>
      <div class="ak-info">
        <div class="ak-title">${ak.title}</div>
        <div class="ak-badges">
          <span class="badge ${badgeClass}">${ak.type}</span>
          <span class="badge badge-green">${ak.subject_name}</span>
          <span class="badge badge-gray">${ak.section_name}</span>
        </div>
        <div class="ak-meta">${itemCount} answer item${itemCount !== 1 ? 's' : ''} · Created ${createdAt}</div>
      </div>
    </div>
    <div class="ak-card-right">
      <button class="btn-icon view" title="View">
        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
        </svg>
      </button>
    </div>`;

  const viewBtn = card.querySelector('.btn-icon.view');
  viewBtn.style.cssText = 'position:relative;z-index:10;pointer-events:all;cursor:pointer;';
  viewBtn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); openViewModal(ak); });

  return card;
}

function escHtml(str) {
  return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ===========================
// VIEW MODAL
// ===========================
const viewOverlay = document.getElementById('viewOverlay');

function openViewModal(ak) {
  document.getElementById('viewToolbarTitle').textContent = ak.title;

  const body = document.getElementById('viewBody');
  const answers = ak.answers ? JSON.parse(ak.answers) : [];

  const ITEMS_PER_COL = 10;
  const colCount = Math.max(1, Math.ceil(answers.length / ITEMS_PER_COL));

  let colsHTML = '';
  for (let c = 0; c < colCount; c++) {
    const start = c * ITEMS_PER_COL;
    const slice = answers.slice(start, start + ITEMS_PER_COL);
    let rowsHTML = slice.map((a, j) => {
      const num = start + j + 1;
      const ans = (a.answer || '').toUpperCase();
      const isMC = ['A','B','C','D'].includes(ans);
      const isTF = ans === 'TRUE' || ans === 'FALSE';
      let ansHTML = isMC
        ? `<span class="ak-bubble">${escHtml(a.answer)}</span>`
        : isTF
          ? `<span class="ak-tf-badge">${escHtml(a.answer)}</span>`
          : `<span class="ak-text-ans">${escHtml(a.answer)}</span>`;
      return `<div class="pdf-row"><span class="pdf-num">${num}.</span>${ansHTML}</div>`;
    }).join('');
    colsHTML += `<div class="pdf-col">${rowsHTML}</div>`;
  }

  body.innerHTML = `
    <div class="pdf-header">
      <div class="pdf-school">MINDFUL SCHOOL OF BERLYN ACHIEVERS</div>
      <div class="pdf-title">${escHtml(ak.title)}</div>
      <div class="pdf-meta-row">
        <span><strong>Section:</strong> ${escHtml(ak.section_name)}</span>
        <span><strong>Subject:</strong> ${escHtml(ak.subject_name)}</span>
        <span><strong>Type:</strong> ${escHtml(ak.type)}</span>
        <span><strong>Items:</strong> ${answers.length}</span>
      </div>
      <div class="pdf-divider"></div>
      <div class="pdf-label">ANSWER KEY</div>
    </div>
    ${answers.length ? `<div class="pdf-cols">${colsHTML}</div>` : '<p class="pdf-empty">No answer items in this key.</p>'}`;

  viewOverlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

document.getElementById('viewClose').addEventListener('click',    () => { viewOverlay.classList.remove('open'); document.body.style.overflow = ''; });
document.getElementById('viewCloseBtn').addEventListener('click', () => { viewOverlay.classList.remove('open'); document.body.style.overflow = ''; });
viewOverlay.addEventListener('click', e => { if (e.target === viewOverlay) { viewOverlay.classList.remove('open'); document.body.style.overflow = ''; } });

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

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    viewOverlay.classList.remove('open');
    document.body.style.overflow = '';
  }
});
