const API = window.API_URL || 'http://localhost:3000/api';

let allSectionsData = [];

window.addEventListener('DOMContentLoaded', () => { loadSections(); });

async function loadSections() {
  try {
    const [secRes, stuRes] = await Promise.all([
      fetch(`${API}/sections`, { headers: { 'Authorization': localStorage.getItem('token') } }),
      fetch(`${API}/students`, { headers: { 'Authorization': localStorage.getItem('token') } })
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
    sections.forEach((sec, index) => sectionsGrid.appendChild(createSectionCard(sec, index)));
  }
}

function createSectionCard(section, index) {
  const card = document.createElement('a');
  card.href = `../Student_Page/Student_Page.html?section_id=${section.id}`;
  card.className = 'section-card';
  card.style.animationDelay = `${index * 0.06}s`;
  card.title = 'View students in this section';

  card.innerHTML = `
    <div class="section-card-header">
      <div class="section-card-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#2563eb" stroke-width="2">
          <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
          <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
        </svg>
      </div>
      <span class="section-card-name">${section.name}</span>
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
      <span style="font-size:11px;color:#6b7280;">View Students →</span>
    </div>
  `;

  return card;
}

let toastTimer;
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast ${type} show`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3000);
}
