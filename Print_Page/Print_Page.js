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
    sEl.innerHTML = '<option value="" disabled hidden>Select section</option>';
    sections.forEach(s => { const o = document.createElement('option'); o.value = s.id; o.textContent = s.name; sEl.appendChild(o); });

    const subEl = document.getElementById('subjectSelect');
    subEl.innerHTML = '<option value="" disabled hidden>Select subject</option>';
    subjects.forEach(s => { const o = document.createElement('option'); o.value = s.id; o.textContent = s.name; subEl.appendChild(o); });

    setTimeout(loadQuestionnaires, 0);
  } catch { showToast('Could not load data.', 'error'); }
}

document.getElementById('sectionSelect').addEventListener('change', loadQuestionnaires);
document.getElementById('subjectSelect').addEventListener('change', loadQuestionnaires);

async function loadQuestionnaires() {
  const sId  = document.getElementById('sectionSelect').value;
  const subId = document.getElementById('subjectSelect').value;
  const qSel  = document.getElementById('questionnaireSelect');
  qSel.innerHTML = '<option value="" disabled hidden>Select questionnaire</option>';
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

  // Build answer items list
  const items = [];
  parts.forEach(part => {
    part.questions.forEach(() => {
      const typ = part.type === 'multiple_choice' ? 'MC'
                : part.type === 'true_false'      ? 'T/F'
                : part.type === 'essay'           ? 'ES' : 'ID';
      items.push({ num: items.length + 1, typ });
    });
  });

  const total = items.length;
  const half  = Math.ceil(total / 2);

  // Build two-column rows
  let rows = '';
  for (let i = 0; i < half; i++) {
    const left  = items[i];
    const right = items[i + half];
    rows += `<tr>
      <td class="qn">${left.num}</td>
      <td class="ans-cell"><div class="write-line"></div></td>
      <td class="typ">${left.typ}</td>
      <td class="col-gap"></td>
      ${right ? `
      <td class="qn">${right.num}</td>
      <td class="ans-cell"><div class="write-line"></div></td>
      <td class="typ">${right.typ}</td>` : `<td colspan="3"></td>`}
    </tr>`;
  }

  win.document.write(`<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<title>OCR Answer Sheet – ${escHtml(q.title)}</title>
<style>
* { box-sizing:border-box; margin:0; padding:0; }
body { font-family:Arial,sans-serif; background:#f3f4f6; color:#000; padding-top:56px; }

/* ── FLOATING TOOLBAR ── */
#as-toolbar {
  position:fixed; top:0; left:0; right:0; height:56px;
  background:#1e2d6b; display:flex; align-items:center;
  justify-content:flex-end; gap:10px; padding:0 20px;
  box-shadow:0 2px 10px rgba(0,0,0,0.25); z-index:1000;
}
#as-toolbar .tb-label {
  flex:1; color:rgba(255,255,255,0.75); font-size:12px; font-weight:600;
}
.tb-btn {
  display:flex; align-items:center; gap:6px;
  padding:8px 18px; border-radius:8px; border:none;
  font-size:13px; font-weight:700; cursor:pointer; white-space:nowrap;
}
.tb-btn-print { background:rgba(255,255,255,0.15); color:#fff; }
.tb-btn-print:hover { background:rgba(255,255,255,0.25); }
.tb-btn-pdf { background:#fff; color:#1e2d6b; }
.tb-btn-pdf:hover { background:#e8eeff; }
.tb-btn:disabled { opacity:0.6; cursor:not-allowed; }

/* ── PAPER ── */
#as-paper { background:#fff; max-width:860px; margin:20px auto; padding:10mm; box-shadow:0 2px 16px rgba(0,0,0,0.1); }

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
tr:nth-child(even) td:not(.col-gap) { background:#f8f9ff; }
.qn { font-weight:900; font-size:14px; text-align:center; width:28px; color:#1a2eaa; padding:5px 3px; }
.ans-cell { padding:5px 8px; }
.col-gap { width:10px; background:#fff !important; border:none; border-top:1px solid #e5e7eb; border-bottom:1px solid #e5e7eb; }
.write-line { border-bottom:2px solid #000; height:30px; width:100%; }
.typ { font-size:9px; color:#888; text-align:center; width:32px; font-weight:700; padding:4px; }

/* ── SCORE BOX ── */
.score-wrap { display:flex; justify-content:flex-end; margin-top:14px; }
.score-box { border:3px solid #1a2eaa; border-radius:8px; padding:8px 24px; text-align:center; min-width:120px; }
.score-lbl { font-size:9px; font-weight:700; color:#1a2eaa; letter-spacing:1.5px; text-transform:uppercase; }
.score-val { font-size:20px; font-weight:900; color:#000; margin-top:4px; }

@media print {
  #as-toolbar { display:none; }
  body { background:#fff; padding-top:0; }
  #as-paper { box-shadow:none; margin:0; padding:8mm; max-width:100%; }
  @page { size:A4; margin:8mm; }
}
</style>
</head>
<body>

<!-- TOOLBAR (right-side buttons) -->
<div id="as-toolbar">
  <span class="tb-label">OCR Answer Sheet · ${escHtml(q.title)}</span>
  <button class="tb-btn tb-btn-print" onclick="window.print()">🖨️ Print</button>
  <button class="tb-btn tb-btn-pdf" id="tbtnPdf">📥 Save as PDF</button>
</div>

<!-- PAPER -->
<div id="as-paper">
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
      • <strong>Multiple Choice (MC):</strong> Write only the letter — <strong>A, B, C, or D</strong> — on the line<br/>
      • <strong>True/False (T/F):</strong> Write <strong>TRUE</strong> or <strong>FALSE</strong> on the line<br/>
      • <strong>Identification (ID):</strong> Write your answer clearly in PRINT letters on the line<br/>
      • Use BLACK pen or pencil — write LARGE and CLEAR for accurate AI scanning
    </p>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:28px;">#</th>
        <th>Answer</th>
        <th style="width:30px;">Type</th>
        <th style="width:10px;background:#fff;border:none;"></th>
        <th style="width:28px;">#</th>
        <th>Answer</th>
        <th style="width:30px;">Type</th>
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
</div>

<script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
<script>
document.getElementById('tbtnPdf').addEventListener('click', function() {
  var btn     = this;
  var toolbar = document.getElementById('as-toolbar');
  var paper   = document.getElementById('as-paper');
  btn.textContent = '⏳ Generating...';
  btn.disabled = true;
  // Collapse toolbar + spacing so html2canvas captures no blank space at top
  toolbar.style.display = 'none';
  document.body.style.paddingTop = '0';
  document.body.style.background  = '#fff';
  paper.style.margin    = '0';
  paper.style.boxShadow = 'none';
  html2pdf().set({
    margin: 8,
    filename: 'Answer_Sheet - ${escHtml(q.title)} - ${escHtml(section)}.pdf',
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, logging: false },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  }).from(paper).save().then(function() {
    // Restore
    toolbar.style.display           = 'flex';
    document.body.style.paddingTop  = '56px';
    document.body.style.background  = '#f3f4f6';
    paper.style.margin    = '20px auto';
    paper.style.boxShadow = '0 2px 16px rgba(0,0,0,0.1)';
    btn.textContent = '📥 Save as PDF';
    btn.disabled = false;
  });
});
</script>
</body>
</html>`);
  win.document.close();
}


document.getElementById('savePdfBtn').addEventListener('click', () => {
  const title   = document.getElementById('previewTitle').textContent;
  const section = document.getElementById('previewSection').textContent;
  if (!title) { alert('Please select a questionnaire first.'); return; }
  const btn = document.getElementById('savePdfBtn');
  btn.textContent = '⏳ Generating...';
  btn.disabled = true;
  html2pdf().set({
    margin: 10,
    filename: `${title}${section ? ' - ' + section : ''}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  }).from(document.getElementById('examPaper')).save().then(() => {
    btn.textContent = '📥 Save Exam PDF';
    btn.disabled = false;
  });
});

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