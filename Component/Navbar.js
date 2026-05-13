/**
 * Navbar.js
 * ─────────────────────────────────────────────────────────
 * Automatically loads navbar + sidebar into every page.
 * Login protection is handled here for ALL pages.
 *
 * Usage: Add this to every page HTML:
 *   <div id="navbar-placeholder"></div>
 *   <script src="../Component/Navbar.js"></script>
 *
 * Set the active page on <body>:
 *   <body data-page="sections">
 */

// ── Global 401 interceptor — redirect to login if session expires ──
(function () {
  const _fetch = window.fetch;
  window.fetch = async function (...args) {
    const res = await _fetch(...args);
    if (res.status === 401) {
      const path = window.location.pathname.toLowerCase();
      const isPublic = ['login', 'signup', 'admin_login'].some(p => path.includes(p));
      if (!isPublic) {
        localStorage.removeItem('token');
        localStorage.removeItem('fullname');
        localStorage.removeItem('email');
        localStorage.removeItem('gender');
        alert('Your session has expired. Please log in again.');
        window.location.href = '../LogIn_Page/LogIn_Page.html';
      }
    }
    return res;
  };
})();

(function () {

  const NAVBAR_HTML = `
<header class="navbar">
  <div class="navbar-left">
    <div class="nav-logo-box">
      <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M32 14L6 26L32 38L58 26L32 14Z" fill="#F5A623"/>
        <path d="M20 32V44C20 44 25 50 32 50C39 50 44 44 44 44V32L32 38L20 32Z" fill="#F5A623"/>
        <line x1="52" y1="26" x2="52" y2="42" stroke="#F5A623" stroke-width="3" stroke-linecap="round"/>
        <circle cx="52" cy="44" r="3" fill="#F5A623"/>
      </svg>
    </div>
    <div class="nav-title">
      <span class="nav-school">Mindful School of Berlyn Achievers</span>
      <span class="nav-sub">Exam Management System</span>
    </div>
  </div>
  <div class="navbar-right">
    <div class="nav-user">
      <span class="nav-username" id="navUsername">User</span>
      <span class="nav-email" id="navEmail">user@gmail.com</span>
    </div>
    <button class="tour-help-btn" id="tourHelpBtn">❓ Tutorial</button>
    <button class="btn-logout" id="logoutBtn">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none"
        viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
        <polyline points="16 17 21 12 16 7"/>
        <line x1="21" y1="12" x2="9" y2="12"/>
      </svg>
      Logout
    </button>
  </div>
</header>

<aside class="sidebar">
  <nav class="sidebar-nav">
    <a href="../Dashboard_Page/Dashboard_Page.html" class="nav-item" data-page="dashboard">
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <rect x="3" y="3" width="7" height="4"/><rect x="14" y="3" width="7" height="4"/>
        <rect x="3" y="10" width="18" height="4"/><rect x="3" y="17" width="18" height="4"/>
      </svg>
      Dashboard
    </a>
    <a href="../Section_Page/Section_Page.html" class="nav-item" data-page="sections">
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
        <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
      </svg>
      Sections
    </a>
    <a href="../Student_Page/Student_Page.html" class="nav-item" data-page="students">
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
      Students
    </a>
    <a href="../Subject_Page/Subject_Page.html" class="nav-item" data-page="subjects">
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
      </svg>
      Subjects
    </a>
    <a href="../Questionnaire_Page/Questionnares_Page.html" class="nav-item" data-page="questionnaires">
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
      </svg>
      Questionnaires
    </a>
    <a href="../Answer_Key/Answer_Keys.html" class="nav-item" data-page="answerkeys">
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <polyline points="9 15 11 17 15 13"/>
      </svg>
      Answer Keys
    </a>
    <a href="../Records_Page/Records_Page.html" class="nav-item" data-page="records">
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
        <line x1="8" y1="21" x2="16" y2="21"/>
        <line x1="12" y1="17" x2="12" y2="21"/>
      </svg>
      Records
    </a>
    <a href="../Test_Bank/Test_Bank.html" class="nav-item" data-page="testbank">
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <ellipse cx="12" cy="5" rx="9" ry="3"/>
        <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
        <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
      </svg>
      Test Bank
    </a>
    <a href="../Print_Page/Print_Page.html" class="nav-item" data-page="print">
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <polyline points="6 9 6 2 18 2 18 9"/>
        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
        <rect x="6" y="14" width="12" height="8"/>
      </svg>
      Print
    </a>
  </nav>
</aside>
`;

  // ── Pages that DON'T need login check ──────────────────
  // These are the login/signup pages themselves
  const PUBLIC_PAGES = ['login', 'signup'];

  function isPublicPage() {
    const path = window.location.pathname.toLowerCase();
    return PUBLIC_PAGES.some(p => path.includes(p));
  }

  function loadNavbar() {
    const placeholder = document.getElementById('navbar-placeholder');
    if (!placeholder) return;

    // ── Login check — only for protected pages ──────────
    // Skip check on login/signup pages to avoid redirect loop
    if (!isPublicPage()) {
      const token = localStorage.getItem('token');
      if (!token) {
        window.location.href = '../LogIn_Page/LogIn_Page.html';
        return;
      }
    }

    placeholder.innerHTML = NAVBAR_HTML;

    setActiveNavItem();
    loadUserInfo();
    wireLogout();
  }

  function setActiveNavItem() {
    const currentPage = document.body.dataset.page || '';
    if (!currentPage) return;
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
      item.classList.remove('active');
      if (item.dataset.page === currentPage) {
        item.classList.add('active');
      }
    });
  }

  function loadUserInfo() {
    const fullname = localStorage.getItem('fullname') || 'User';
    const email    = localStorage.getItem('email')    || 'user@gmail.com';
    const nameEl   = document.getElementById('navUsername');
    const emailEl  = document.getElementById('navEmail');
    if (nameEl)  nameEl.textContent  = fullname;
    if (emailEl) emailEl.textContent = email;
    const welcomeEl = document.getElementById('welcomeName');
    if (welcomeEl) welcomeEl.textContent = fullname;
  }

  function wireLogout() {
    const btn = document.getElementById('logoutBtn');
    if (!btn) return;
    btn.addEventListener('click', () => {
      if (confirm('Are you sure you want to log out?')) {
        localStorage.removeItem('token');
        localStorage.removeItem('fullname');
        localStorage.removeItem('email');
        localStorage.removeItem('gender');
        window.location.href = '../LogIn_Page/LogIn_Page.html';
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadNavbar);
  } else {
    loadNavbar();
  }

})();

// ═══════════════════════════════════════════════════════
// GUIDED TOUR ENGINE
// ═══════════════════════════════════════════════════════
(function () {
  // Inject Tutorial.css once
  const cssLink = document.createElement('link');
  cssLink.rel = 'stylesheet';
  cssLink.href = (function () {
    const scripts = document.getElementsByTagName('script');
    for (let i = 0; i < scripts.length; i++) {
      const src = scripts[i].src || '';
      if (src.includes('Navbar.js')) return src.replace('Navbar.js', 'Tutorial.css');
    }
    return '../Component/Tutorial.css';
  })();
  document.head.appendChild(cssLink);

  const STEPS = [
    {
      title: 'Welcome to the System! 👋',
      text: "This quick tour covers all the main features. Click Next to continue, or Skip to close.",
      target: null
    },
    {
      title: '📊 Dashboard',
      text: 'Your home screen. See a real-time overview of students, sections, questionnaires, answer keys, and exam records.',
      target: '[data-page="dashboard"]'
    },
    {
      title: '📋 Sections',
      text: 'Create class sections (e.g., Grade 7-Einstein). Sections group your students and link to their exams.',
      target: '[data-page="sections"]'
    },
    {
      title: '👥 Students',
      text: 'Add students and assign them to sections. Each student has a unique ID used during exam scanning and grading.',
      target: '[data-page="students"]'
    },
    {
      title: '📖 Subjects',
      text: 'Admin manages the subject list (e.g., Science, Math). All teachers can view subjects and use them in questionnaires.',
      target: '[data-page="subjects"]'
    },
    {
      title: '📝 Questionnaires',
      text: 'Create exams with multiple parts — Multiple Choice, True or False, Identification, and Essay. Upload a .json file to reuse an existing exam, or import questions from the Test Bank.',
      target: '[data-page="questionnaires"]'
    },
    {
      title: '✅ Answer Keys',
      text: 'Answer keys are auto-generated when you save a questionnaire. They are view-only and used by the scanner to grade student papers.',
      target: '[data-page="answerkeys"]'
    },
    {
      title: '📈 Exam Records',
      text: 'View graded results by section and subject. See class averages, highest scores, and pass rates. Switch to "By Student" for individual summaries, or export to CSV.',
      target: '[data-page="records"]'
    },
    {
      title: '🗄️ Test Bank',
      text: 'A library of reusable questions by subject and topic. Admin approves questions, teachers can suggest new ones. Import a whole topic into any questionnaire in one click.',
      target: '[data-page="testbank"]'
    },
    {
      title: '🖨️ Print',
      text: 'Generate a print-ready version of any questionnaire formatted for distribution to students.',
      target: '[data-page="print"]'
    },
    {
      title: "You're all set! 🎉",
      text: "You now know all the main features. Click the ❓ Tutorial button in the top bar anytime to replay this tour.",
      target: null
    }
  ];

  let currentStep = 0;
  let spotEl, tooltipEl, backdropEl;

  function startTour(step) {
    currentStep = step || 0;
    localStorage.setItem('tour_step', currentStep);
    if (!backdropEl) buildDOM();
    backdropEl.style.display = '';
    spotEl.style.display = '';
    tooltipEl.style.display = '';
    renderStep();
  }

  function endTour() {
    if (backdropEl) backdropEl.style.display = 'none';
    if (spotEl)     spotEl.style.display = 'none';
    if (tooltipEl)  tooltipEl.style.display = 'none';
    localStorage.setItem('tour_seen', '1');
    localStorage.removeItem('tour_step');
  }

  function buildDOM() {
    backdropEl = document.createElement('div');
    backdropEl.className = 'tour-backdrop';

    spotEl    = document.createElement('div');
    spotEl.className = 'tour-spotlight';

    tooltipEl = document.createElement('div');
    tooltipEl.className = 'tour-tooltip';

    document.body.appendChild(backdropEl);
    document.body.appendChild(spotEl);
    document.body.appendChild(tooltipEl);
  }

  function renderStep() {
    const step = STEPS[currentStep];
    const total = STEPS.length;
    const isFirst = currentStep === 0;
    const isLast  = currentStep === total - 1;

    // Dots
    const dots = STEPS.map((_, i) =>
      `<div class="tour-dot${i === currentStep ? ' active' : ''}"></div>`
    ).join('');

    tooltipEl.innerHTML = `
      <div class="tour-step-badge">Step ${currentStep + 1} of ${total}</div>
      <div class="tour-title">${step.title}</div>
      <div class="tour-text">${step.text}</div>
      <div class="tour-dots">${dots}</div>
      <div class="tour-btns">
        <button class="tour-btn-skip" id="tourSkip">${isLast ? '' : 'Skip tour'}</button>
        <div class="tour-btn-group">
          ${!isFirst ? '<button class="tour-btn-prev" id="tourPrev">← Back</button>' : ''}
          <button class="tour-btn-next" id="tourNext">${isLast ? 'Done ✓' : 'Next →'}</button>
        </div>
      </div>`;

    tooltipEl.querySelector('#tourNext').addEventListener('click', function () {
      if (isLast) { endTour(); } else { currentStep++; localStorage.setItem('tour_step', currentStep); renderStep(); }
    });
    const prevBtn = tooltipEl.querySelector('#tourPrev');
    if (prevBtn) prevBtn.addEventListener('click', function () { currentStep--; localStorage.setItem('tour_step', currentStep); renderStep(); });
    const skipBtn = tooltipEl.querySelector('#tourSkip');
    if (skipBtn) skipBtn.addEventListener('click', endTour);

    positionStep(step);
  }

  function positionStep(step) {
    const PAD = 12;

    if (!step.target) {
      // Center screen — no spotlight
      spotEl.style.cssText = 'display:none;';
      tooltipEl.className  = 'tour-tooltip no-arrow';
      tooltipEl.style.cssText = `
        top: 50%; left: 50%;
        transform: translate(-50%, -50%);
        display: block;`;
      return;
    }

    const target = document.querySelector(step.target);
    if (!target) { currentStep++; if (currentStep < STEPS.length) renderStep(); return; }

    const r = target.getBoundingClientRect();

    // Position spotlight
    spotEl.style.cssText = `
      top:    ${r.top    - PAD}px;
      left:   ${r.left   - PAD}px;
      width:  ${r.width  + PAD * 2}px;
      height: ${r.height + PAD * 2}px;
      display: block;`;
    spotEl.className = 'tour-spotlight';

    // Decide tooltip side
    const viewW = window.innerWidth;
    const viewH = window.innerHeight;
    const tipW  = 310;
    const tipH  = 240;

    let top, left, arrowClass;

    if (r.right + PAD + tipW + 16 < viewW) {
      // Place to the right
      left = r.right + PAD + 8;
      top  = Math.max(10, Math.min(r.top - PAD, viewH - tipH - 10));
      arrowClass = 'arrow-left';
    } else if (r.left - PAD - tipW - 16 > 0) {
      // Place to the left
      left = r.left - PAD - tipW - 8;
      top  = Math.max(10, Math.min(r.top - PAD, viewH - tipH - 10));
      arrowClass = 'arrow-right';
    } else if (r.bottom + PAD + tipH + 16 < viewH) {
      // Below
      top  = r.bottom + PAD + 8;
      left = Math.max(10, Math.min(r.left, viewW - tipW - 10));
      arrowClass = 'arrow-top';
    } else {
      // Above
      top  = r.top - PAD - tipH - 8;
      left = Math.max(10, Math.min(r.left, viewW - tipW - 10));
      arrowClass = 'arrow-bottom';
    }

    tooltipEl.style.cssText = `top:${top}px; left:${left}px; transform:none; display:block;`;
    tooltipEl.className = `tour-tooltip ${arrowClass}`;
  }

  // Wire up Tutorial button (added after navbar loads)
  function wireTutorial() {
    const btn = document.getElementById('tourHelpBtn');
    if (btn) btn.addEventListener('click', function () {
      localStorage.removeItem('tour_seen');
      startTour(0);
    });

    const path = window.location.pathname.toLowerCase();
    const isPublic = ['login', 'signup'].some(p => path.includes(p));
    if (isPublic) return;

    const savedStep = localStorage.getItem('tour_step');
    if (savedStep !== null) {
      // Resume in-progress tour after page navigation
      setTimeout(function () { startTour(parseInt(savedStep, 10)); }, 800);
    } else if (!localStorage.getItem('tour_seen')) {
      // Auto-start for first-time visitors
      setTimeout(function () { startTour(0); }, 800);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wireTutorial);
  } else {
    setTimeout(wireTutorial, 100);
  }

})();