// ===========================
// LOAD SECTIONS FROM BACKEND
// ===========================
window.addEventListener('DOMContentLoaded', () => {
  loadSections();
});

const API = window.API_URL || 'http://localhost:3000/api';

// ===========================
// FETCH ALL SECTIONS
// ===========================
let allSectionsData = [];

async function loadSections() {
  try {
    const [secRes, stuRes] = await Promise.all([
      fetch(`${API}/sections`, { headers: { 'Authorization': localStorage.getItem('token') } }),
      fetch(`${API}/students`,  { headers: { 'Authorization': localStorage.getItem('token') } })
    ]);
    const sections = await secRes.json();
    const students = await stuRes.json();

    const countMap = {};
    (Array.isArray(students) ? students : []).forEach(s => {
      if (s.section_id) countMap[s.section_id] = (countMap[s.section_id] || 0) + 1;
    });

    allSectionsData = (Array.isArray(sections) ? sections : []).map(sec => ({
      ...sec,
      students: countMap[sec.id] || 0
    }));
    renderSections(allSectionsData);
  } catch (err) {
    showToast('Could not load sections. Is the server running?', 'error');
  }
}

function handleSearch(query) {
  const q = query.toLowerCase().trim();
  document.getElementById('searchClear').style.display = q ? 'block' : 'none';
  if (!q) { renderSections(allSectionsData); return; }
  const filtered = allSectionsData.filter(s =>
    (s.name||'').toLowerCase().includes(q) ||
    (s.grade||'').toLowerCase().includes(q) ||
    (s.adviser||'').toLowerCase().includes(q)
  );
  renderSections(filtered);
}

function clearSearch() {
  document.getElementById('searchInput').value = '';
  document.getElementById('searchClear').style.display = 'none';
  renderSections(allSectionsData);
}

// ===========================
// RENDER SECTIONS
// ===========================
function renderSections(sections) {
  const emptyState   = document.getElementById('emptyState');
  const sectionsGrid = document.getElementById('sectionsGrid');

  sectionsGrid.innerHTML = '';

  if (sections.length === 0) {
    emptyState.style.display   = 'flex';
    sectionsGrid.style.display = 'none';
  } else {
    emptyState.style.display   = 'none';
    sectionsGrid.style.display = 'grid';
    sections.forEach((sec, index) => {
      sectionsGrid.appendChild(createSectionCard(sec, index));
    });
  }
}

function createSectionCard(section, index) {
  const card = document.createElement('div');
  card.className = 'section-card';
  card.style.animationDelay = `${index * 0.06}s`;

  card.innerHTML = `
    <div class="section-card-header">
      <div class="section-card-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#2563eb" stroke-width="2">
          <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
          <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
        </svg>
      </div>
      <span class="section-card-name">${section.name}</span>
      <div class="section-card-actions">
        <button class="btn-icon edit" title="Edit" data-id="${section.id}">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
        <button class="btn-icon delete" title="Delete" data-id="${section.id}">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
            <path d="M10 11v6"/><path d="M14 11v6"/>
            <path d="M9 6V4h6v2"/>
          </svg>
        </button>
      </div>
    </div>
    <div class="section-card-meta">
      ${section.grade ? `
        <div class="section-meta-item">
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
            <path d="M6 12v5c3 3 9 3 12 0v-5"/>
          </svg>
          ${section.grade}
        </div>` : ''}
      ${section.adviser ? `
        <div class="section-meta-item">
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
          ${section.adviser}
        </div>` : ''}
    </div>
    <div class="section-card-footer">
      <span class="student-count-badge">
        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
        ${section.students || 0} Students
      </span>
    </div>
  `;

  card.querySelector('.btn-icon.edit').addEventListener('click', () => openEditModal(section));
  card.querySelector('.btn-icon.delete').addEventListener('click', () => openDeleteModal(section));

  return card;
}


// ===========================
// ADD / EDIT MODAL
// ===========================
let editingId = null;

const modalOverlay   = document.getElementById('modalOverlay');
const modalTitle     = document.getElementById('modalTitle');
const sectionName    = document.getElementById('sectionName');
const sectionGrade   = document.getElementById('sectionGrade');
const sectionAdviser = document.getElementById('sectionAdviser');
const sectionNameError = document.getElementById('sectionNameError');

function openAddModal() {
  editingId = null;
  modalTitle.textContent = 'Add Section';
  sectionName.value    = '';
  sectionGrade.value   = '';
  sectionAdviser.value = '';
  clearInputError(sectionName, sectionNameError);
  modalOverlay.classList.add('open');
  setTimeout(() => sectionName.focus(), 100);
}

function openEditModal(section) {
  editingId = section.id;
  modalTitle.textContent = 'Edit Section';
  sectionName.value    = section.name;
  sectionGrade.value   = section.grade || '';
  // Auto-fill adviser: Mr./Ms. + Last Name
  const rawName1   = localStorage.getItem('fullname') || '';
  const gender1    = localStorage.getItem('gender') || '';
  const cleanName1 = rawName1.replace(/^(Mr\.|Ms\.|Mrs\.)\s*/i, '').trim();
  const parts1     = cleanName1.split(' ');
  const lastName1  = parts1[parts1.length - 1] || '';
  let title1 = '';
  if (gender1 === 'female' || /^Ms\./i.test(rawName1) || /^Mrs\./i.test(rawName1)) title1 = 'Ms. ';
  else if (gender1 === 'male' || /^Mr\./i.test(rawName1)) title1 = 'Mr. ';
  sectionAdviser.value = section.adviser || (title1 + lastName1);
  clearInputError(sectionName, sectionNameError);
  modalOverlay.classList.add('open');
  setTimeout(() => sectionName.focus(), 100);
}

function closeModal() {
  modalOverlay.classList.remove('open');
}

document.getElementById('addSectionBtn').addEventListener('click', openAddModal);
document.getElementById('createFirstBtn').addEventListener('click', openAddModal);
document.getElementById('modalClose').addEventListener('click', closeModal);
document.getElementById('modalCancel').addEventListener('click', closeModal);
modalOverlay.addEventListener('click', (e) => {
  if (e.target === modalOverlay) closeModal();
});

// Save section
document.getElementById('modalSave').addEventListener('click', async () => {
  const name = sectionName.value.trim();

  if (!name) {
    showInputError(sectionName, sectionNameError, 'Section name is required.');
    return;
  }

  clearInputError(sectionName, sectionNameError);

  const payload = {
    name,
    grade:   sectionGrade.value,
    adviser: sectionAdviser.value.trim()
  };

  try {
    let res;
    if (editingId !== null) {
      res = await fetch(`${API}/sections/${editingId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': localStorage.getItem('token')
        },
        body: JSON.stringify(payload)
      });
    } else {
      res = await fetch(`${API}/sections`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': localStorage.getItem('token')
        },
        body: JSON.stringify(payload)
      });
    }

    if (res.ok) {
      showToast(editingId ? 'Section updated!' : 'Section added!', 'success');
      closeModal();
      loadSections();
    } else {
      showToast('Something went wrong. Try again.', 'error');
    }
  } catch (err) {
    showToast('Could not connect to server.', 'error');
  }
});


// ===========================
// DELETE MODAL
// ===========================
let deleteId = null;
let deleteSection = null;

const deleteOverlay     = document.getElementById('deleteOverlay');
const deleteSectionName = document.getElementById('deleteSectionName');

function openDeleteModal(section) {
  deleteId = section.id;
  deleteSection = section;
  deleteSectionName.textContent = section.name;
  deleteOverlay.classList.add('open');
}

function closeDeleteModal() {
  deleteOverlay.classList.remove('open');
}

document.getElementById('deleteClose').addEventListener('click', closeDeleteModal);
document.getElementById('deleteCancelBtn').addEventListener('click', closeDeleteModal);
deleteOverlay.addEventListener('click', (e) => {
  if (e.target === deleteOverlay) closeDeleteModal();
});

document.getElementById('deleteConfirmBtn').addEventListener('click', () => {
  if (!deleteId) return;
  requireAuthThenDelete(
    deleteSection?.name || 'this section',
    'sections', deleteId, deleteSection,
    () => { showToast('Section archived.', 'success'); closeDeleteModal(); loadSections(); deleteId = null; deleteSection = null; }
  );
});


// ===========================
// HELPER: Input Error
// ===========================
function showInputError(input, errorEl, message) {
  input.classList.add('input-error');
  errorEl.textContent = message;
}

function clearInputError(input, errorEl) {
  input.classList.remove('input-error');
  errorEl.textContent = '';
}

sectionName.addEventListener('input', () => clearInputError(sectionName, sectionNameError));


// ===========================
// TOAST NOTIFICATION
// ===========================
let toastTimer;

function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast ${type} show`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}


// ===========================
// KEYBOARD: Escape closes modals
// ===========================
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeModal();
    closeDeleteModal();
  }
  if (e.key === 'Enter' && modalOverlay.classList.contains('open')) {
    document.getElementById('modalSave').click();
  }
});