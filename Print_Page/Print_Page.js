const API = window.API_URL || 'http://localhost:3000/api';

const PART_LABELS = {
  multiple_choice: 'Letter Shading / Multiple Choice',
  true_false:      'True or False',
  identification:  'Identification',
  essay:           'Essay'
};

function toRoman(num) {
  const v=['M','CM','D','CD','C','XC','L','XL','X','IX','V','IV','I'];
  const n=[1000,900,500,400,100,90,50,40,10,9,5,4,1];
  let r=''; for(let i=0;i<n.length;i++) while(num>=n[i]){r+=v[i];num-=n[i];} return r;
}

window.addEventListener('DOMContentLoaded', () => { loadDropdowns(); });

async function loadDropdowns() {
  try {
    const [sRes, subRes] = await Promise.all([
      fetch(`${API}/sections`, { headers: { 'Authorization': localStorage.getItem('token') } }),
      fetch(`${API}/subjects`, { headers: { 'Authorization': localStorage.getItem('token') } })
    ]);
    const sections = await sRes.json();
    const subjects = await subRes.json();

    const sEl = document.getElementById('sectionSelect');
    sEl.innerHTML = '<option value="">Select section</option>';
    sections.forEach(s => { const o = document.createElement('option'); o.value = s.id; o.textContent = s.name; sEl.appendChild(o); });

    const subEl = document.getElementById('subjectSelect');
    subEl.innerHTML = '<option value="">Select subject</option>';
    subjects.forEach(s => { const o = document.createElement('option'); o.value = s.id; o.textContent = s.name; subEl.appendChild(o); });
  } catch { showToast('Could not load data.', 'error'); }
}

document.getElementById('sectionSelect').addEventListener('change', loadQuestionnaires);
document.getElementById('subjectSelect').addEventListener('change', loadQuestionnaires);

async function loadQuestionnaires() {
  const sId  = document.getElementById('sectionSelect').value;
  const subId = document.getElementById('subjectSelect').value;
  const qSel  = document.getElementById('questionnaireSelect');
  qSel.innerHTML = '<option value="">Select questionnaire</option>';
  document.getElementById('previewArea').style.display = 'none';
  document.getElementById('promptState').style.display = 'flex';
  if (!sId || !subId) return;

  try {
    const res  = await fetch(`${API}/questionnaires?section_id=${sId}&subject_id=${subId}`, { headers: { 'Authorization': localStorage.getItem('token') } });
    const data = await res.json();
    if (!data.length) { qSel.innerHTML = '<option value="">No questionnaires found</option>'; return; }
    data.forEach(q => { const o = document.createElement('option'); o.value = q.id; o.textContent = q.title; qSel.appendChild(o); });
  } catch { showToast('Could not load questionnaires.', 'error'); }
}

document.getElementById('questionnaireSelect').addEventListener('change', async function () {
  const id = this.value;
  if (!id) { document.getElementById('previewArea').style.display = 'none'; document.getElementById('promptState').style.display = 'flex'; return; }
  try {
    const res = await fetch(`${API}/questionnaires/${id}`, { headers: { 'Authorization': localStorage.getItem('token') } });
    const q   = await res.json();
    renderPreview(q);
  } catch { showToast('Could not load questionnaire.', 'error'); }
});

function parseParts(q) {
  try {
    const p = JSON.parse(q.questions);
    if (Array.isArray(p) && p[0] && p[0].questions) return p;
    if (Array.isArray(p)) return [{ type: 'multiple_choice', direction: 'Choose the letter of the best answer.', questions: p.map(qt => ({ text: qt.text||'', answer: qt.answer||'', choices: qt.choices||{A:'',B:'',C:'',D:''} })) }];
  } catch {}
  return [];
}

function renderPreview(q) {
  document.getElementById('promptState').style.display = 'none';
  document.getElementById('previewArea').style.display = 'block';

  const parts = parseParts(q);
  const totalItems = parts.reduce((t, p) => t + p.questions.length, 0);

  document.getElementById('previewTitle').textContent   = q.title;
  document.getElementById('previewType').textContent    = q.type;
  document.getElementById('previewSection').textContent = q.section_name;
  document.getElementById('previewSubject').textContent = q.subject_name;
  document.getElementById('previewTotal').textContent   = `Total: ${totalItems} item${totalItems !== 1 ? 's' : ''}`;
  document.getElementById('scoreTotal').textContent     = totalItems;

  const container = document.getElementById('partsContainer');
  container.innerHTML = '';
  let qNum = 1;

  parts.forEach((part, pi) => {
    const partDiv = document.createElement('div');
    partDiv.className = 'print-part';

    // Part header
    partDiv.innerHTML = `
      <div class="part-header">
        <span class="part-roman">${toRoman(pi + 1)}.</span>
        <span class="part-label-text">${PART_LABELS[part.type] || part.type}</span>
      </div>
      ${part.direction ? `<div class="part-direction">${escHtml(part.direction)}</div>` : ''}`;

    part.questions.forEach(qt => {
      const qDiv = document.createElement('div');
      qDiv.className = 'print-question';

      let answerHTML = '';

      if (part.type === 'multiple_choice') {
        // Show choices as plain text — no bubbles, no answer input
        const c = qt.choices || {};
        answerHTML = `
          <div class="mc-choices-ocr">
            <div class="mc-row-4">
              <span class="mc-item"><span class="mc-label">A.</span>${escHtml(c.A||'')}</span>
              <span class="mc-item"><span class="mc-label">B.</span>${escHtml(c.B||'')}</span>
              <span class="mc-item"><span class="mc-label">C.</span>${escHtml(c.C||'')}</span>
              <span class="mc-item"><span class="mc-label">D.</span>${escHtml(c.D||'')}</span>
            </div>
          </div>`;

      } else if (part.type === 'true_false') {
        // No bubbles — just show the statement, students answer on sheet
        answerHTML = '';

      } else if (part.type === 'identification') {
        // No answer line — students write on answer sheet
        answerHTML = '';

      } else if (part.type === 'essay') {
        // Essay lines stay — students write on exam paper
        answerHTML = `
          <div class="essay-lines-ocr">
            <div class="essay-line"></div>
            <div class="essay-line"></div>
            <div class="essay-line"></div>
            <div class="essay-line"></div>
            <div class="essay-line"></div>
          </div>`;
      }

      // OCR anchor: question number is LARGE and clear on its own
      qDiv.innerHTML = `
        <div class="print-q-row">
          <span class="print-q-num">${qNum}.</span>
          <div class="print-q-body">
            <div class="print-q-text">${escHtml(qt.text)}</div>
            ${answerHTML}
          </div>
        </div>`;

      partDiv.appendChild(qDiv);
      qNum++;
    });

    container.appendChild(partDiv);
  });

  // Update print title
  document.title = `${q.title} – ${q.section_name}`;
}

// ═══════════════════════════════════════
// ANSWER SHEET GENERATOR
// ═══════════════════════════════════════
document.getElementById('answerSheetBtn').addEventListener('click', () => {
  const title   = document.getElementById('previewTitle').textContent;
  const section = document.getElementById('previewSection').textContent;
  const subject = document.getElementById('previewSubject').textContent;
  if (!title) { alert('Please select a questionnaire first.'); return; }
  const qId = document.getElementById('questionnaireSelect').value;
  if (!qId) { alert('Please select a questionnaire first.'); return; }
  fetch(`${API}/questionnaires/${qId}`, { headers: { 'Authorization': localStorage.getItem('token') } })
    .then(r => r.json())
    .then(q => { const parts = parseParts(q); openAnswerSheet(q, parts, section, subject); });
});

document.getElementById('printBothBtn').addEventListener('click', () => {
  const title   = document.getElementById('previewTitle').textContent;
  const section = document.getElementById('previewSection').textContent;
  const subject = document.getElementById('previewSubject').textContent;
  if (!title) { alert('Please select a questionnaire first.'); return; }
  const qId = document.getElementById('questionnaireSelect').value;
  if (!qId) { alert('Please select a questionnaire first.'); return; }
  // Print exam first, then answer sheet after a short delay
  document.getElementById('printBtn').click();
  fetch(`${API}/questionnaires/${qId}`, { headers: { 'Authorization': localStorage.getItem('token') } })
    .then(r => r.json())
    .then(q => { const parts = parseParts(q); setTimeout(() => openAnswerSheet(q, parts, section, subject), 800); });
});

function openAnswerSheet(q, parts, section, subject) {
  const win = window.open('', '_blank');

  // Build OCR-optimized answer rows
  let rows = '';
  let qNum = 1;

  parts.forEach(part => {
    part.questions.forEach(() => {
      if (part.type === 'multiple_choice') {
        rows += `<tr>
          <td class="qn">${qNum}</td>
          <td class="ans-cell mc-cell">
            <div class="mc-options">
              <span class="mc-opt">A <div class="write-box"></div></span>
              <span class="mc-opt">B <div class="write-box"></div></span>
              <span class="mc-opt">C <div class="write-box"></div></span>
              <span class="mc-opt">D <div class="write-box"></div></span>
            </div>
            <div class="write-answer"></div>
          </td>
          <td class="typ">MC</td>
        </tr>`;
      } else if (part.type === 'true_false') {
        rows += `<tr>
          <td class="qn">${qNum}</td>
          <td class="ans-cell">
            <div class="tf-options">
              <span class="tf-opt">TRUE <div class="write-box tf-box"></div></span>
              <span class="tf-opt">FALSE <div class="write-box tf-box"></div></span>
            </div>
          </td>
          <td class="typ">T/F</td>
        </tr>`;
      } else if (part.type === 'identification') {
        rows += `<tr>
          <td class="qn">${qNum}</td>
          <td class="ans-cell id-ans">
            <div class="id-write-line"></div>
          </td>
          <td class="typ">ID</td>
        </tr>`;
      } else {
        rows += `<tr>
          <td class="qn">${qNum}</td>
          <td class="ans-cell" style="font-size:10px;color:#888;font-style:italic;padding:8px;">See back of paper</td>
          <td class="typ">ES</td>
        </tr>`;
      }
      qNum++;
    });
  });

  const total = qNum - 1;

  win.document.write(`<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<title>OCR Answer Sheet – ${escHtml(q.title)}</title>
<style>
* { box-sizing:border-box; margin:0; padding:0; }
body { font-family:Arial,sans-serif; background:#fff; padding:10mm; color:#000; }

/* ── HEADER ── */
.hdr { text-align:center; border-bottom:3px solid #1a2eaa; padding-bottom:8px; margin-bottom:10px; }
.school { font-size:11px; font-weight:900; text-transform:uppercase; letter-spacing:1px; color:#1a2eaa; }
.title  { font-size:18px; font-weight:900; margin:4px 0 2px; color:#000; }
.badge  { background:#1a2eaa; color:#fff; font-size:10px; font-weight:700; padding:2px 14px; border-radius:20px; display:inline-block; margin-top:2px; }
.ocr-tag { font-size:9px; color:#666; margin-top:3px; letter-spacing:0.5px; }

/* ── INFO ROW ── */
.info { display:grid; grid-template-columns:2fr 1fr 1fr; gap:8px; margin-bottom:6px; }
.info2 { display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:10px; }
.ifield { display:flex; align-items:flex-end; gap:5px; font-size:10px; font-weight:700; }
.iline { flex:1; border-bottom:2px solid #000; height:16px; }

/* ── INSTRUCTIONS ── */
.instr { border:2px solid #1a2eaa; border-radius:6px; padding:8px 12px; margin-bottom:10px; background:#f0f4ff; }
.instr p { font-size:10px; color:#000; line-height:1.8; }

/* ── TABLE ── */
table { width:100%; border-collapse:collapse; }
th { background:#1a2eaa; color:#fff; font-size:10px; font-weight:700; padding:6px; text-align:center; border:1px solid #1a2eaa; }
td { border:1px solid #ccc; vertical-align:middle; }
tr:nth-child(even) { background:#f8f9ff; }

/* ── QUESTION NUMBER ── */
.qn { font-weight:900; font-size:14px; text-align:center; width:34px; color:#1a2eaa; padding:6px 4px; }

/* ── ANSWER CELL ── */
.ans-cell { padding:6px 10px; }

/* ── MC: write-in boxes with letter labels ── */
.mc-options { display:flex; gap:8px; align-items:center; }
.mc-opt { display:flex; align-items:center; gap:3px; font-size:10px; font-weight:700; color:#555; }
.write-box {
  width:28px; height:28px;
  border:2px solid #000; border-radius:4px;
  background:#fff;
}
.tf-options { display:flex; gap:12px; align-items:center; }
.tf-opt { display:flex; align-items:center; gap:4px; font-size:10px; font-weight:700; color:#555; }
.tf-box { width:38px; height:28px; }

/* ── IDENTIFICATION WRITE LINE ── */
.id-ans { padding:4px 10px 6px !important; }
.id-write-line {
  border-bottom:2px solid #000;
  height:28px;
  margin-top:4px;
  width:100%;
}

/* ── TYPE LABEL ── */
.typ { font-size:9px; color:#888; text-align:center; width:32px; font-weight:700; padding:4px; }

/* ── SCORE BOX ── */
.score-wrap { display:flex; justify-content:flex-end; margin-top:14px; }
.score-box { border:3px solid #1a2eaa; border-radius:8px; padding:8px 24px; text-align:center; min-width:120px; }
.score-lbl { font-size:9px; font-weight:700; color:#1a2eaa; letter-spacing:1.5px; text-transform:uppercase; }
.score-val { font-size:20px; font-weight:900; color:#000; margin-top:4px; }

@media print {
  body { padding:8mm; }
  @page { size:A4; margin:8mm; }
}
</style>
</head>
<body>

<div class="hdr">
  <div class="school">Mindful School of Berlyn Achievers</div>
  <div class="title">OCR Answer Sheet</div>
  <span class="badge">${escHtml(q.title)}</span>
  <div class="ocr-tag">AI-Powered Optical Character Recognition</div>
</div>

<div class="info">
  <div class="ifield">Name: <div class="iline"></div></div>
  <div class="ifield">Section: <strong>${escHtml(section)}</strong></div>
  <div class="ifield">Date: <div class="iline"></div></div>
</div>
<div class="info2">
  <div class="ifield">Subject: <strong>${escHtml(subject)}</strong></div>
  <div class="ifield">Total Items: <strong>${total}</strong></div>
</div>

<div class="instr">
  <p>
    <strong>Instructions:</strong><br/>
    • <strong>Multiple Choice (MC):</strong> Write the letter of your answer (A, B, C, or D) inside the box next to your chosen option<br/>
    • <strong>True/False (T/F):</strong> Write <strong>TRUE</strong> or <strong>FALSE</strong> inside the box<br/>
    • <strong>Identification (ID):</strong> Write your answer CLEARLY in PRINT letters on the line<br/>
    • Use BLACK pen or pencil — write LARGE and CLEAR for accurate scanning
  </p>
</div>

<table>
  <thead>
    <tr>
      <th style="width:34px;">#</th>
      <th>Answer</th>
      <th style="width:32px;">Type</th>
    </tr>
  </thead>
  <tbody>${rows}</tbody>
</table>

<div class="score-wrap">
  <div class="score-box">
    <div class="score-lbl">Score</div>
    <div class="score-val">_____ / ${total}</div>
  </div>
</div>

<script>window.onload = () => window.print();</script>
</body>
</html>`);
  win.document.close();
}


document.getElementById('printBtn').addEventListener('click', () => {
  const qTitle   = document.getElementById('previewTitle').textContent || 'Questionnaire';
  const section  = document.getElementById('previewSection').textContent || '';
  const oldTitle = document.title;
  document.title = qTitle + (section ? ' – ' + section : '');
  window.print();
  setTimeout(() => { document.title = oldTitle; }, 1000);
});

function escHtml(str) {
  return (str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

let toastTimer;
function showToast(msg, type='success') {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg; t.className = `toast ${type} show`;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 3000);
}