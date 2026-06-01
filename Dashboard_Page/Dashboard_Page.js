// ===========================
// NOTE: Login protection is handled
// automatically by Navbar.js
// No need to add it here!
// ===========================

const API = window.API_URL || 'http://localhost:3000/api';

// ===========================
// LOAD STATS FROM BACKEND
// ===========================
window.addEventListener('DOMContentLoaded', () => {
  loadStats();
});

async function loadStats() {
  ['sections', 'students', 'questionnaires', 'answerkeys', 'subjects', 'records'].forEach(key => {
    const el = document.getElementById(`stat-${key}`);
    if (el) { el.textContent = '—'; el.classList.add('loading'); }
  });

  try {
    const [statsRes, recordsRes] = await Promise.all([
      fetch(`${API}/teacher/stats`, { headers: { 'Authorization': localStorage.getItem('token') } }),
      fetch(`${API}/records`,       { headers: { 'Authorization': localStorage.getItem('token') } })
    ]);

    const stats   = await statsRes.json();
    const records = await recordsRes.json();

    setStat('sections',       stats.sections);
    setStat('students',       stats.students);
    setStat('subjects',       stats.subjects);
    setStat('questionnaires', stats.questionnaires);
    setStat('answerkeys',     stats.answerkeys);
    setStat('records',        stats.records);

    loadRecentActivity(records);
    loadChart(records);

  } catch (err) {
    console.error('Could not load dashboard stats:', err);
    ['sections', 'students', 'questionnaires', 'answerkeys', 'subjects', 'records'].forEach(key => {
      setStat(key, '—');
    });
  }
}

function setStat(key, value) {
  const el = document.getElementById(`stat-${key}`);
  if (!el) return;
  el.classList.remove('loading');
  el.textContent = value;
}

// ===========================
// RECENT ACTIVITY
// ===========================
async function loadRecentActivity(data) {
  try {
    const el   = document.getElementById('recentActivity');
    if (!el) return;

    if (!data.length) {
      el.innerHTML = '<div class="activity-empty">No records yet. Start scanning!</div>';
      return;
    }

    // Show last 5 records
    const recent = data.slice(0, 5);
    el.innerHTML = recent.map(r => {
      const pct   = parseFloat(r.percentage) || 0;
      const grade = pct >= 90 ? 'A' : pct >= 80 ? 'B' : pct >= 70 ? 'C' : pct >= 60 ? 'D' : 'F';
      const color = pct >= 80 ? '#16a34a' : pct >= 60 ? '#d97706' : '#dc2626';
      const date  = new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const initials = (r.student_name || 'S').split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase();
      return `
        <div class="activity-item">
          <div class="activity-avatar">${initials}</div>
          <div class="activity-info">
            <div class="activity-name">${r.student_name || '—'}</div>
            <div class="activity-sub">${r.exam_title || r.subject_name || '—'} · ${date}</div>
          </div>
          <div class="activity-score" style="color:${color}">
            <strong>${r.score}/${r.total}</strong>
            <span class="activity-grade">${grade}</span>
          </div>
        </div>`;
    }).join('');
  } catch(e) { console.error(e); }
}

// ===========================
// PERFORMANCE CHART
// ===========================
async function loadChart(data) {
  try {
    const canvas = document.getElementById('perfChart');
    const empty  = document.getElementById('chartEmpty');
    if (!canvas) return;

    if (!data.length) {
      canvas.style.display = 'none';
      if (empty) empty.style.display = 'flex';
      return;
    }

    // Group by subject and calculate average
    const subjectMap = {};
    data.forEach(r => {
      const sub = r.subject_name || 'Unknown';
      if (!subjectMap[sub]) subjectMap[sub] = { total: 0, count: 0 };
      subjectMap[sub].total += parseFloat(r.percentage) || 0;
      subjectMap[sub].count++;
    });

    const labels = Object.keys(subjectMap).slice(0, 6);
    const values = labels.map(k => Math.round(subjectMap[k].total / subjectMap[k].count));
    const colors = values.map(v => v >= 80 ? '#16a34a' : v >= 60 ? '#d97706' : '#dc2626');

    new Chart(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Avg Score (%)',
          data: values,
          backgroundColor: colors,
          borderRadius: 8,
          borderSkipped: false,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: { label: ctx => `${ctx.parsed.y}% average` }
          }
        },
        scales: {
          y: {
            beginAtZero: true, max: 100,
            ticks: { callback: v => v + '%' },
            grid: { color: '#f3f4f6' }
          },
          x: { grid: { display: false } }
        }
      }
    });
  } catch(e) { console.error(e); }
}