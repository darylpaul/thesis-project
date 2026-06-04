const API = window.API_URL || 'http://localhost:3000/api';

// ===========================
// COLOR CONFIG
// ===========================
const colorMap = {
  blue:   { stripe: 'stripe-blue',   icon: 'icon-blue',   label: 'Blue'   },
  green:  { stripe: 'stripe-green',  icon: 'icon-green',  label: 'Green'  },
  purple: { stripe: 'stripe-purple', icon: 'icon-purple', label: 'Purple' },
  orange: { stripe: 'stripe-orange', icon: 'icon-orange', label: 'Orange' },
  pink:   { stripe: 'stripe-pink',   icon: 'icon-pink',   label: 'Pink'   },
  teal:   { stripe: 'stripe-teal',   icon: 'icon-teal',   label: 'Teal'   },
};

// ===========================
// ON PAGE LOAD
// ===========================
const userRole = localStorage.getItem('role') || 'teacher';

window.addEventListener('DOMContentLoaded', () => {
  if (userRole !== 'admin') {
    const addBtn = document.getElementById('addSubjectBtn');
    if (addBtn) addBtn.style.display = 'none';
    const firstBtn = document.getElementById('createFirstBtn');
    if (firstBtn) firstBtn.style.display = 'none';
  }
  loadSubjects();
});

// ===========================
// LOAD SUBJECTS FROM BACKEND
// ===========================
let allSubjectsData = [];

async function loadSubjects() {
  try {
    const res = await fetch(`${API}/subjects`, { headers: { 'Authorization': localStorage.getItem('token') } });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `Server error (${res.status})`);
    allSubjectsData = Array.isArray(data) ? data : [];
    renderSubjects(allSubjectsData);
  } catch (err) {
    showToast('Could not load subjects. Is the server running?', 'error');
  }
}

function handleSearch(query) {
  const q = query.toLowerCase().trim();
  document.getElementById('searchClear').style.display = q ? 'block' : 'none';
  if (!q) { renderSubjects(allSubjectsData); return; }
  const filtered = allSubjectsData.filter(s =>
    (s.name||'').toLowerCase().includes(q) ||
    (s.code||'').toLowerCase().includes(q)
  );
  renderSubjects(filtered);
}

function clearSearch() {
  document.getElementById('searchInput').value = '';
  document.getElementById('searchClear').style.display = 'none';
  renderSubjects(allSubjectsData);
}

// ===========================
// RENDER SUBJECTS
// ===========================
function renderSubjects(subjects) {
  const emptyState   = document.getElementById('emptyState');
  const subjectsGrid = document.getElementById('subjectsGrid');

  subjectsGrid.innerHTML = '';

  if (subjects.length === 0) {
    emptyState.style.display   = 'flex';
    subjectsGrid.style.display = 'none';
  } else {
    emptyState.style.display   = 'none';
    subjectsGrid.style.display = 'grid';
    subjects.forEach((subject, index) => {
      subjectsGrid.appendChild(createSubjectCard(subject, index));
    });
  }
}

function createSubjectCard(subject, index) {
  const color = colorMap[subject.color] || colorMap.blue;
  const card  = document.createElement('div');
  card.className = 'subject-card';
  card.style.animationDelay = `${index * 0.06}s`;

  card.innerHTML = `
    <div class="card-stripe ${color.stripe}"></div>
    <div class="card-body">
      <div class="card-top">
        <div class="subject-icon ${color.icon}">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none"
            viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
          </svg>
        </div>
        ${userRole === 'admin' ? `
        <div class="card-actions">
          <button class="btn-icon edit" title="Edit">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none"
              viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
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
        </div>` : ''}
      </div>
      <div class="subject-name">${subject.name}</div>
      ${subject.code ? `<div class="subject-code">${subject.code}</div>` : ''}
      ${subject.description ? `<p class="subject-desc">${subject.description}</p>` : ''}
    </div>
    <div class="card-footer">
      ${subject.grade
        ? `<span class="grade-badge">
             <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
               <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
               <path d="M6 12v5c3 3 9 3 12 0v-5"/>
             </svg>
             ${subject.grade}
           </span>`
        : ''}
    </div>
  `;

  if (userRole === 'admin') {
    card.querySelector('.btn-icon.edit').addEventListener('click', () => openEditModal(subject));
    card.querySelector('.btn-icon.delete').addEventListener('click', () => openDeleteModal(subject));
  }

  return card;
}

// ===========================
// ADD / EDIT MODAL
// ===========================
let editingId = null;

const modalOverlay     = document.getElementById('modalOverlay');
const modalTitle       = document.getElementById('modalTitle');
const subjectNameInput = document.getElementById('subjectName');
const subjectCodeInput = document.getElementById('subjectCode');
const subjectGrade     = document.getElementById('subjectGrade');
const subjectColor     = document.getElementById('subjectColor');
const subjectDesc      = document.getElementById('subjectDesc');
const subjectNameError = document.getElementById('subjectNameError');

function clearModal() {
  subjectNameInput.value = '';
  subjectCodeInput.value = '';
  subjectGrade.value     = '';
  subjectColor.value     = 'blue';
  subjectDesc.value      = '';
  subjectNameInput.classList.remove('input-error');
  subjectNameError.textContent = '';
}

function openAddModal() {
  editingId = null;
  modalTitle.textContent = 'Add Subject';
  clearModal();
  modalOverlay.classList.add('open');
  setTimeout(() => subjectNameInput.focus(), 100);
}

function openEditModal(subject) {
  editingId = subject.id;
  modalTitle.textContent   = 'Edit Subject';
  subjectNameInput.value   = subject.name;
  subjectCodeInput.value   = subject.code        || '';
  subjectGrade.value       = subject.grade       || '';
  subjectColor.value       = subject.color       || 'blue';
  subjectDesc.value        = subject.description || '';
  subjectNameInput.classList.remove('input-error');
  subjectNameError.textContent = '';
  modalOverlay.classList.add('open');
  setTimeout(() => subjectNameInput.focus(), 100);
}

function closeModal() {
  modalOverlay.classList.remove('open');
}

document.getElementById('addSubjectBtn').addEventListener('click', openAddModal);
document.getElementById('createFirstBtn').addEventListener('click', openAddModal);
document.getElementById('modalClose').addEventListener('click', closeModal);
document.getElementById('modalCancel').addEventListener('click', closeModal);
// Outside click disabled — prevents accidental loss of subject form data

subjectNameInput.addEventListener('input', () => {
  subjectNameInput.classList.remove('input-error');
  subjectNameError.textContent = '';
});

document.getElementById('modalSave').addEventListener('click', async () => {
  const name = subjectNameInput.value.trim();

  if (!name) {
    subjectNameInput.classList.add('input-error');
    subjectNameError.textContent = 'Subject name is required.';
    return;
  }

  const payload = {
    name,
    code:        subjectCodeInput.value.trim(),
    grade:       subjectGrade.value,
    color:       subjectColor.value,
    description: subjectDesc.value.trim()
  };

  try {
    let res;
    if (editingId !== null) {
      res = await fetch(`${API}/subjects/${editingId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': localStorage.getItem('token')
        },
        body: JSON.stringify(payload)
      });
    } else {
      res = await fetch(`${API}/subjects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': localStorage.getItem('token')
        },
        body: JSON.stringify(payload)
      });
    }

    if (res.ok) {
      showToast(editingId ? 'Subject updated!' : 'Subject added!', 'success');
      closeModal();
      loadSubjects();
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
let deleteId      = null;
let deleteSubject = null;

const deleteOverlay     = document.getElementById('deleteOverlay');
const deleteSubjectName = document.getElementById('deleteSubjectName');

function openDeleteModal(subject) {
  deleteId      = subject.id;
  deleteSubject = subject;
  deleteSubjectName.textContent = subject.name;
  deleteOverlay.classList.add('open');
}

function closeDeleteModal() {
  deleteOverlay.classList.remove('open');
}

document.getElementById('deleteClose').addEventListener('click', closeDeleteModal);
document.getElementById('deleteCancelBtn').addEventListener('click', closeDeleteModal);
deleteOverlay.addEventListener('click', (e) => { if (e.target === deleteOverlay) closeDeleteModal(); });

document.getElementById('deleteConfirmBtn').addEventListener('click', () => {
  requireAuthThenDelete(
    (deleteSubject && deleteSubject.name ? deleteSubject.name : 'this subject'),
    'subjects', deleteId, deleteSubject,
    () => { showToast('Subject archived.', 'success'); closeDeleteModal(); loadSubjects(); deleteId = null; deleteSubject = null; }
  );
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
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { closeModal(); closeDeleteModal(); }
  if (e.key === 'Enter' && modalOverlay.classList.contains('open')) {
    document.getElementById('modalSave').click();
  }
});