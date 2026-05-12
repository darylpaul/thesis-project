const API = window.API_URL || 'http://localhost:3000/api';

// ===========================
// AVATAR HELPERS
// ===========================
const avatarColors = ['avatar-blue', 'avatar-green', 'avatar-purple', 'avatar-orange', 'avatar-pink'];

function getAvatarColor(index) {
  return avatarColors[index % avatarColors.length];
}

function getInitials(firstName, lastName) {
  return (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
}

// ===========================
// ON PAGE LOAD
// ===========================
window.addEventListener('DOMContentLoaded', () => {
  populateSectionDropdowns();
  loadStudents();
});

// ===========================
// POPULATE SECTION DROPDOWNS FROM BACKEND
// ===========================
async function populateSectionDropdowns() {
  try {
    const res = await fetch(`${API}/sections`, {
      headers: { 'Authorization': localStorage.getItem('token') }
    });
    const sections = await res.json();

    const filterSelect = document.getElementById('sectionFilter');
    const modalSection = document.getElementById('studentSection');

    filterSelect.innerHTML = '<option value="">All Sections</option>';
    modalSection.innerHTML = '<option value="">Select section</option>';

    sections.forEach(sec => {
      const opt1 = document.createElement('option');
      opt1.value = sec.id;
      opt1.textContent = sec.name;
      filterSelect.appendChild(opt1);

      const opt2 = document.createElement('option');
      opt2.value = sec.id;
      opt2.textContent = sec.name;
      modalSection.appendChild(opt2);
    });
  } catch (err) {
    showToast('Could not load sections.', 'error');
  }
}

// ===========================
// LOAD STUDENTS FROM BACKEND
// ===========================
let allStudentsData = [];

async function loadStudents(sectionId = '') {
  try {
    const url = sectionId ? `${API}/students?section_id=${sectionId}` : `${API}/students`;
    const res = await fetch(url, { headers: { 'Authorization': localStorage.getItem('token') } });
    allStudentsData = await res.json();
    renderStudents(allStudentsData);
    // Reapply search if active
    const q = document.getElementById('searchInput')?.value || '';
    if (q) handleSearch(q);
  } catch (err) {
    showToast('Could not load students. Is the server running?', 'error');
  }
}

function handleSearch(query) {
  const q = query.toLowerCase().trim();
  document.getElementById('searchClear').style.display = q ? 'block' : 'none';
  if (!q) { renderStudents(allStudentsData); return; }
  const filtered = allStudentsData.filter(s =>
    (s.first_name||'').toLowerCase().includes(q) ||
    (s.last_name||'').toLowerCase().includes(q) ||
    (s.student_id||'').toLowerCase().includes(q) ||
    (s.section_name||'').toLowerCase().includes(q)
  );
  renderStudents(filtered);
}

function clearSearch() {
  document.getElementById('searchInput').value = '';
  document.getElementById('searchClear').style.display = 'none';
  renderStudents(allStudentsData);
}

// ===========================
// RENDER STUDENTS TABLE
// ===========================
function renderStudents(students) {
  const emptyState = document.getElementById('emptyState');
  const tableWrap  = document.getElementById('tableWrap');
  const tbody      = document.getElementById('studentsTableBody');

  tbody.innerHTML = '';

  if (students.length === 0) {
    emptyState.style.display = 'flex';
    tableWrap.style.display  = 'none';
    return;
  }

  emptyState.style.display = 'none';
  tableWrap.style.display  = 'block';

  students.forEach((student, index) => {
    const tr = document.createElement('tr');
    tr.style.animationDelay = `${index * 0.04}s`;

    const genderClass = student.gender ? student.gender.toLowerCase() : 'other';

    tr.innerHTML = `
      <td class="row-num">${index + 1}</td>
      <td>
        <div class="student-name-cell">
          <div class="student-avatar ${getAvatarColor(index)}">
            ${getInitials(student.first_name, student.last_name)}
          </div>
          <span class="student-full-name">${student.last_name}, ${student.first_name}</span>
        </div>
      </td>
      <td><span class="student-id-badge">${student.student_id}</span></td>
      <td><span class="section-badge">${student.section_name || '—'}</span></td>
      <td>
        ${student.gender
          ? `<span class="gender-badge ${genderClass}">${student.gender}</span>`
          : '—'}
      </td>
      <td>
        <div class="action-btns">
          <button class="btn-icon edit" title="Edit">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none"
              viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button class="btn-icon delete" title="Remove">
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

    tr.querySelector('.btn-icon.edit').addEventListener('click', () => openEditModal(student));
    tr.querySelector('.btn-icon.delete').addEventListener('click', () => openDeleteModal(student));

    tbody.appendChild(tr);
  });

  // Table footer count
  let footer = tableWrap.querySelector('.table-footer');
  if (!footer) {
    footer = document.createElement('div');
    footer.className = 'table-footer';
    tableWrap.appendChild(footer);
  }
  footer.textContent = `Showing ${students.length} student${students.length !== 1 ? 's' : ''}`;
}

// ===========================
// SECTION FILTER
// ===========================
document.getElementById('sectionFilter').addEventListener('change', (e) => {
  loadStudents(e.target.value);
});

// ===========================
// ADD / EDIT MODAL
// ===========================
let editingId = null;

const modalOverlay   = document.getElementById('modalOverlay');
const modalTitle     = document.getElementById('modalTitle');
const firstNameInput = document.getElementById('studentFirstName');
const lastNameInput  = document.getElementById('studentLastName');
const studentIdInput = document.getElementById('studentId');
const genderSelect   = document.getElementById('studentGender');
const sectionSelect  = document.getElementById('studentSection');
const firstNameError = document.getElementById('firstNameError');
const lastNameError  = document.getElementById('lastNameError');
const studentIdError = document.getElementById('studentIdError');
const sectionError   = document.getElementById('sectionError');

function clearModal() {
  firstNameInput.value = '';
  lastNameInput.value  = '';
  studentIdInput.value = '';
  genderSelect.value   = '';
  sectionSelect.value  = '';
  [firstNameInput, lastNameInput, studentIdInput].forEach(el => el.classList.remove('input-error'));
  [firstNameError, lastNameError, studentIdError, sectionError].forEach(el => el.textContent = '');
}

function openAddModal() {
  editingId = null;
  modalTitle.textContent = 'Add Student';
  clearModal();
  modalOverlay.classList.add('open');
  setTimeout(() => firstNameInput.focus(), 100);
}

function openEditModal(student) {
  editingId = student.id;
  modalTitle.textContent = 'Edit Student';
  firstNameInput.value   = student.first_name;
  lastNameInput.value    = student.last_name;
  studentIdInput.value   = student.student_id;
  genderSelect.value     = student.gender || '';
  sectionSelect.value    = student.section_id || '';
  [firstNameInput, lastNameInput, studentIdInput].forEach(el => el.classList.remove('input-error'));
  [firstNameError, lastNameError, studentIdError, sectionError].forEach(el => el.textContent = '');
  modalOverlay.classList.add('open');
  setTimeout(() => firstNameInput.focus(), 100);
}

function closeModal() {
  modalOverlay.classList.remove('open');
}

document.getElementById('addStudentBtn').addEventListener('click', openAddModal);
document.getElementById('addFirstStudentBtn').addEventListener('click', openAddModal);
document.getElementById('modalClose').addEventListener('click', closeModal);
document.getElementById('modalCancel').addEventListener('click', closeModal);
modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) closeModal(); });

firstNameInput.addEventListener('input', () => clearError(firstNameInput, firstNameError));
lastNameInput.addEventListener('input',  () => clearError(lastNameInput, lastNameError));
studentIdInput.addEventListener('input', () => clearError(studentIdInput, studentIdError));
sectionSelect.addEventListener('change', () => { sectionError.textContent = ''; });

function clearError(input, errorEl) {
  input.classList.remove('input-error');
  errorEl.textContent = '';
}

function showError(input, errorEl, msg) {
  input.classList.add('input-error');
  errorEl.textContent = msg;
}

document.getElementById('modalSave').addEventListener('click', async () => {
  const firstName = firstNameInput.value.trim();
  const lastName  = lastNameInput.value.trim();
  const studentId = studentIdInput.value.trim();
  const section   = sectionSelect.value;
  let valid = true;

  if (!firstName) { showError(firstNameInput, firstNameError, 'First name is required.'); valid = false; }
  if (!lastName)  { showError(lastNameInput,  lastNameError,  'Last name is required.');  valid = false; }
  if (!studentId) { showError(studentIdInput, studentIdError, 'Student ID is required.'); valid = false; }
  if (!section)   { sectionError.textContent = 'Please select a section.'; valid = false; }

  if (!valid) return;

  const payload = {
    first_name: firstName,
    last_name:  lastName,
    student_id: studentId,
    gender:     genderSelect.value,
    section_id: section
  };

  try {
    let res;
    if (editingId !== null) {
      res = await fetch(`${API}/students/${editingId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': localStorage.getItem('token')
        },
        body: JSON.stringify(payload)
      });
    } else {
      res = await fetch(`${API}/students`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': localStorage.getItem('token')
        },
        body: JSON.stringify(payload)
      });
    }

    if (res.ok) {
      showToast(editingId ? 'Student updated!' : 'Student added!', 'success');
      closeModal();
      loadStudents(document.getElementById('sectionFilter').value);
    } else {
      const data = await res.json();
      showToast(data.error || 'Something went wrong.', 'error');
    }
  } catch (err) {
    showToast('Could not connect to server.', 'error');
  }
});

// ===========================
// DELETE MODAL
// ===========================
let deleteId = null;
let deleteStudent = null;

const deleteOverlay     = document.getElementById('deleteOverlay');
const deleteStudentName = document.getElementById('deleteStudentName');

function openDeleteModal(student) {
  deleteId = student.id;
  deleteStudent = student;
  deleteStudentName.textContent = `${student.first_name} ${student.last_name}`;
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
    (deleteStudent ? deleteStudent.first_name + ' ' + deleteStudent.last_name : 'this student'),
    'students', deleteId, deleteStudent,
    () => { showToast('Student archived.', 'success'); closeDeleteModal(); loadStudents(); deleteId = null; deleteStudent = null; }
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
