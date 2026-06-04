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
  if (!sId && !subId) return;

  const params = new URLSearchParams();
  if (sId)  params.append('section_id', sId);
  if (subId) params.append('subject_id', subId);

  try {
    const res  = await fetch(`${API}/questionnaires?${params}`, { headers: { 'Authorization': localStorage.getItem('token') } });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `Server error (${res.status})`);
    if (!Array.isArray(data) || !data.length) { qSel.innerHTML = '<option value="">No questionnaires found</option>'; return; }
    data.forEach(q => { const o = document.createElement('option'); o.value = q.id; o.textContent = q.title; qSel.appendChild(o); });
    // Auto-select first and render preview
    qSel.selectedIndex = 1;
    qSel.dispatchEvent(new Event('change'));
  } catch { showToast('Could not load questionnaires.', 'error'); }
}

document.getElementById('questionnaireSelect').addEventListener('change', async function () {
  const id = this.value;
  if (!id) { document.getElementById('previewArea').style.display = 'none'; document.getElementById('promptState').style.display = 'flex'; return; }
  try {
    const res = await fetch(`${API}/questionnaires/${id}`, { headers: { 'Authorization': localStorage.getItem('token') } });
    const q   = await res.json();
    if (!res.ok) throw new Error(q.error || `Server error (${res.status})`);
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
        answerHTML = `
          <div class="tf-bubbles">
            <div class="tf-option"><span class="tf-bubble">○</span><span class="tf-word">True</span></div>
            <div class="tf-option"><span class="tf-bubble">○</span><span class="tf-word">False</span></div>
          </div>`;

      } else if (part.type === 'identification') {
        answerHTML = `<div class="id-answer-ocr"><span class="id-label">Answer:</span><div class="id-underline"></div></div>`;

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

  // Build items with types
  const items = [];
  parts.forEach(part => {
    const typ = part.type === 'multiple_choice' ? 'MC'
              : part.type === 'true_false'      ? 'T/F'
              : part.type === 'essay'           ? 'ESS' : 'ID';
    part.questions.forEach(() => items.push({ num: items.length + 1, typ }));
  });

  const total  = items.length;
  const s1     = Math.ceil(total / 3);
  const s2     = Math.ceil((total - s1) / 2);
  const cols   = [items.slice(0, s1), items.slice(s1, s1 + s2), items.slice(s1 + s2)];
  const hasGap = cols[2].length < cols[0].length;

  const buildCol = (colItems, isLast) => `
    <div class="col">
      <div class="col-head">
        <span>#</span><span class="ach">Answer</span><span>Type</span>
      </div>
      <div class="col-rows">
        ${colItems.map(it => `
          <div class="arow">
            <div class="anum">${it.num}</div>
            <div class="acell"><div class="aline"></div></div>
            <div class="atype"><span class="abadge">${it.typ}</span></div>
          </div>`).join('')}
        ${isLast && hasGap ? `
          <div class="score-slot">
            <div class="score-box">
              <div class="score-lbl">Score</div>
              <div class="score-val"><span class="score-line"></span> / ${total}</div>
            </div>
          </div>` : ''}
      </div>
    </div>`;

  win.document.write(`<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<title>OCR Answer Sheet – ${escHtml(q.title)}</title>
<style>
* { box-sizing:border-box; margin:0; padding:0; }
body { font-family:Arial,sans-serif; background:#f3f4f6; padding-top:56px; }

/* ── TOOLBAR ── */
#as-toolbar {
  position:fixed; top:0; left:0; right:0; height:56px;
  background:#1e2d6b; display:flex; align-items:center;
  gap:10px; padding:0 20px; box-shadow:0 2px 10px rgba(0,0,0,0.25); z-index:1000;
}
#as-toolbar .tb-label { flex:1; color:rgba(255,255,255,0.75); font-size:12px; font-weight:600; }
.tb-btn { display:flex; align-items:center; gap:6px; padding:8px 18px; border-radius:8px; border:none; font-size:13px; font-weight:700; cursor:pointer; }
.tb-btn-print { background:rgba(255,255,255,0.15); color:#fff; }
.tb-btn-print:hover { background:rgba(255,255,255,0.25); }

/* ── PAPER ── */
#as-paper {
  background:#fff; max-width:820px; margin:20px auto;
  padding:8mm 10mm; box-shadow:0 2px 16px rgba(0,0,0,0.12);
  min-height:297mm; display:flex; flex-direction:column;
}

/* Corner markers */
.corners { display:flex; justify-content:space-between; flex-shrink:0; }
.marker  { width:9px; height:9px; background:#111; }

/* Header */
.school    { text-align:center; font-size:11px; font-weight:900; text-transform:uppercase; letter-spacing:1px; color:#1a2eaa; margin-top:4px; flex-shrink:0; }
.sheet-sub { text-align:center; font-size:16px; font-weight:900; color:#000; margin:3px 0 1px; flex-shrink:0; }
.exam-ttl  { text-align:center; font-size:10px; font-weight:700; text-transform:uppercase; color:#374151; letter-spacing:0.3px; margin-bottom:3px; flex-shrink:0; }
.divider   { border:none; border-top:1.5px solid #111; margin:3px 0; flex-shrink:0; }

/* Info rows */
.info-row { display:flex; gap:12px; align-items:flex-end; margin-bottom:3px; flex-shrink:0; }
.ifield   { display:flex; align-items:flex-end; gap:4px; font-size:8pt; font-weight:700; }
.ifield.grow { flex:1; }
.iline    { flex:1; min-width:50px; border-bottom:1px solid #111; height:14px; }
.ival     { font-size:8pt; font-weight:700; color:#1a2eaa; border-bottom:1px solid #bbb; height:14px; line-height:14px; }

/* Instructions */
.instr       { border:1.5px solid #1a2eaa; border-radius:4px; padding:5px 10px; margin:5px 0; flex-shrink:0; }
.instr-title { font-size:8pt; font-weight:bold; margin-bottom:2px; }
.instr ul    { list-style:none; padding:0; }
.instr li    { font-size:7.5pt; color:#333; line-height:1.6; }
.instr li::before { content:"• "; }
.instr li strong  { color:#111; }

/* 3 columns */
.cols { display:flex; gap:5px; margin-top:5px; }
.col  { flex:1; display:flex; flex-direction:column; border:1px solid #c8cdd5; }

.col-head { display:grid; grid-template-columns:26px 1fr 32px; background:#f0f1f3; border-bottom:1px solid #c8cdd5; flex-shrink:0; }
.col-head span { font-size:6.5pt; font-weight:700; color:#777; text-align:center; padding:3px 2px; text-transform:uppercase; letter-spacing:0.3px; }
.col-head .ach { text-align:left; padding-left:5px; }

.col-rows { display:flex; flex-direction:column; }

.arow { display:grid; grid-template-columns:26px 1fr 32px; min-height:46px; border-bottom:1px solid #f0f0f0; }
.arow:last-child { border-bottom:none; }

.anum  { font-size:9pt; font-weight:900; color:#1a2eaa; display:flex; align-items:flex-end; justify-content:center; padding-bottom:3px; }
.acell { display:flex; align-items:flex-end; padding:0 5px 3px; }
.aline { width:100%; border-bottom:1.5px solid #555; }
.atype { display:flex; align-items:flex-end; justify-content:center; padding-bottom:4px; }
.abadge { font-size:6pt; font-weight:700; color:#666; background:#f4f5f7; border:1px solid #ddd; border-radius:2px; padding:1px 3px; }

/* Score slot inside col3 */
.score-slot { min-height:46px; display:flex; align-items:center; justify-content:center; padding:4px 6px; }
.score-slot .score-box { width:100%; }

/* Score box fallback (when all cols equal) */
.score-wrap { display:flex; justify-content:flex-end; margin-top:8px; flex-shrink:0; }
.score-box  { border:2px solid #1a2eaa; border-radius:5px; padding:5px 18px; text-align:center; min-width:120px; }
.score-lbl  { font-size:7pt; font-weight:700; color:#374151; text-transform:uppercase; letter-spacing:0.8px; }
.score-val  { font-size:14pt; font-weight:900; color:#111; display:flex; align-items:center; justify-content:center; gap:5px; margin-top:2px; }
.score-line { display:inline-block; width:34px; border-bottom:1.5px solid #111; }

@media print {
  #as-toolbar { display:none; }
  body { background:#fff; padding-top:0; }
  #as-paper { box-shadow:none; margin:0; max-width:100%; height:297mm; }
  @page { size:A4 portrait; margin:8mm 10mm; }
}
</style>
</head>
<body>

<div id="as-toolbar">
  <span class="tb-label">OCR Answer Sheet · ${escHtml(q.title)}</span>
  <button class="tb-btn tb-btn-print" onclick="window.print()">🖨️ Print</button>
</div>

<div id="as-paper">

  <div class="corners" style="margin-bottom:4px;">
    <div class="marker"></div><div class="marker"></div>
  </div>

  <div class="school">Mindful School of Berlyn Achievers</div>
  <div class="sheet-sub">OCR Answer Sheet</div>
  <div class="exam-ttl">${escHtml(q.title)}</div>
  <hr class="divider"/>

  <div class="info-row">
    <div class="ifield grow">Name: <div class="iline"></div></div>
    <div class="ifield">Section: <span class="ival">${escHtml(section)}</span></div>
    <div class="ifield">Date: <div class="iline" style="min-width:70px;"></div></div>
  </div>
  <div class="info-row">
    <div class="ifield grow">Subject: <span class="ival">${escHtml(subject)}</span></div>
    <div class="ifield">Total Items: <span class="ival" style="min-width:28px;text-align:center;">${total}</span></div>
  </div>

  <div class="instr">
    <div class="instr-title">Instructions:</div>
    <ul>
      <li><strong>Multiple Choice (MC):</strong> Write only the letter — <strong>A, B, C, or D</strong> — on the line</li>
      <li><strong>True/False (T/F):</strong> Write <strong>TRUE</strong> or <strong>FALSE</strong> on the line</li>
      <li><strong>Identification (ID):</strong> Write your answer clearly in <strong>PRINT</strong> letters on the line</li>
      <li>Use <strong>BLACK</strong> pen or pencil — write <strong>LARGE</strong> and <strong>CLEAR</strong> for accurate AI scanning</li>
    </ul>
  </div>

  <div class="cols">
    ${buildCol(cols[0], false)}
    ${buildCol(cols[1], false)}
    ${buildCol(cols[2], true)}
  </div>

  ${!hasGap ? `
  <div class="score-wrap">
    <div class="score-box">
      <div class="score-lbl">Score</div>
      <div class="score-val"><span class="score-line"></span> / ${total}</div>
    </div>
  </div>` : ''}

  <div class="corners" style="margin-top:4px;">
    <div class="marker"></div><div class="marker"></div>
  </div>

</div>

</body>
</html>`);
  win.document.close();
  win.focus();
  win.print();
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