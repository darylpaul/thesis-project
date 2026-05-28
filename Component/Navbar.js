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
    <button class="hamburger-btn" id="hamburgerBtn" aria-label="Toggle menu">
      <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
        <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
      </svg>
    </button>
    <img src="../Logo.jpg" alt="School Logo" class="nav-logo-img"/>
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
  <div class="sidebar-qr">
    <div class="sidebar-qr-label">📱 Mobile Scanner App</div>
    <img
      src="https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=https://mobileexamscanner.netlify.app"
      alt="Scan to open mobile app"
      class="sidebar-qr-img"
    />
    <div class="sidebar-qr-caption">Scan to open the<br>mobile scanner</div>
  </div>
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

    // Sidebar overlay for mobile
    const overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    overlay.id = 'sidebarOverlay';
    document.body.appendChild(overlay);

    setActiveNavItem();
    loadUserInfo();
    wireLogout();
    wireHamburger();
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

  function wireHamburger() {
    const hamburger = document.getElementById('hamburgerBtn');
    const sidebar   = document.querySelector('.sidebar');
    const overlay   = document.getElementById('sidebarOverlay');
    if (!hamburger || !sidebar || !overlay) return;

    function openSidebar()  { sidebar.classList.add('open'); overlay.classList.add('active'); }
    function closeSidebar() { sidebar.classList.remove('open'); overlay.classList.remove('active'); }

    hamburger.addEventListener('click', function () {
      sidebar.classList.contains('open') ? closeSidebar() : openSidebar();
    });
    overlay.addEventListener('click', closeSidebar);

    // Close sidebar when a nav link is clicked on mobile
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(function (link) {
      link.addEventListener('click', closeSidebar);
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

  const STEPS = [
    { icon: '👋', title: 'Welcome to the System!',  text: 'This quick tour covers all the main features. Click Next to continue, or Skip to close.' },
    { icon: '📊', title: 'Dashboard',               text: 'Your home screen. See a real-time overview of students, sections, questionnaires, answer keys, and exam records.' },
    { icon: '📋', title: 'Sections',                text: 'Create class sections (e.g., Grade 7-Einstein). Sections group your students and link to their exams.' },
    { icon: '👥', title: 'Students',                text: 'Add students and assign them to sections. Each student has a unique ID used during exam scanning and grading.' },
    { icon: '📖', title: 'Subjects',                text: 'Admin manages the subject list (e.g., Science, Math). All teachers can view subjects and use them in questionnaires.' },
    { icon: '📝', title: 'Questionnaires',          text: 'Create exams with multiple parts — Multiple Choice, True or False, Identification, and Essay. Upload a .json file to reuse an existing exam, or import questions from the Test Bank.' },
    { icon: '✅', title: 'Answer Keys',             text: 'Answer keys are auto-generated when you save a questionnaire. They are view-only and used by the scanner to grade student papers.' },
    { icon: '📈', title: 'Exam Records',            text: 'View graded results by section and subject. See class averages, highest scores, and pass rates. Export to CSV.' },
    { icon: '🗄️', title: 'Test Bank',              text: 'A library of reusable questions by subject and topic. Admin approves questions, teachers can suggest new ones.' },
    { icon: '🖨️', title: 'Print',                  text: 'Generate a print-ready version of any questionnaire formatted for distribution to students.' },
    { icon: '🎉', title: "You're all set!",         text: "You now know all the main features. Click the ❓ Tutorial button in the top bar anytime to replay this tour." }
  ];

  let currentStep = 0;
  let overlayEl, cardEl;

  function buildDOM() {
    overlayEl = document.createElement('div');
    overlayEl.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:99998;display:flex;align-items:center;justify-content:center;';

    cardEl = document.createElement('div');
    cardEl.style.cssText = 'background:#fff;border-radius:20px;padding:36px 32px 28px;max-width:420px;width:90%;box-shadow:0 8px 40px rgba(0,0,0,0.22);text-align:center;position:relative;z-index:99999;';

    overlayEl.appendChild(cardEl);
    document.body.appendChild(overlayEl);
  }

  function startTour(step) {
    currentStep = step || 0;
    localStorage.setItem('tour_step', currentStep);
    if (!overlayEl) buildDOM();
    overlayEl.style.display = 'flex';
    renderStep();
  }

  function endTour() {
    if (overlayEl) overlayEl.style.display = 'none';
    localStorage.setItem('tour_seen', '1');
    localStorage.removeItem('tour_step');
  }

  function renderStep() {
    const step  = STEPS[currentStep];
    const total = STEPS.length;
    const isFirst = currentStep === 0;
    const isLast  = currentStep === total - 1;

    const dots = STEPS.map((_, i) =>
      `<div style="width:8px;height:8px;border-radius:50%;background:${i === currentStep ? '#1a2eaa' : '#d1d5db'};display:inline-block;margin:0 3px;"></div>`
    ).join('');

    cardEl.innerHTML = `
      <div style="font-size:48px;margin-bottom:12px;">${step.icon}</div>
      <div style="font-size:11px;font-weight:700;color:#6b7280;letter-spacing:1px;margin-bottom:6px;">STEP ${currentStep + 1} OF ${total}</div>
      <div style="font-size:20px;font-weight:800;color:#1e2d6b;margin-bottom:10px;">${step.title}</div>
      <div style="font-size:14px;color:#374151;line-height:1.6;margin-bottom:20px;">${step.text}</div>
      <div style="margin-bottom:20px;">${dots}</div>
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <button id="tourSkip" style="background:none;border:none;color:#9ca3af;font-size:13px;cursor:pointer;padding:8px;">${isLast ? '' : 'Skip tour'}</button>
        <div style="display:flex;gap:8px;">
          ${!isFirst ? '<button id="tourPrev" style="padding:9px 18px;border-radius:10px;border:1.5px solid #e5e7eb;background:#fff;color:#374151;font-weight:700;font-size:13px;cursor:pointer;">← Back</button>' : ''}
          <button id="tourNext" style="padding:9px 22px;border-radius:10px;border:none;background:#1a2eaa;color:#fff;font-weight:700;font-size:13px;cursor:pointer;">${isLast ? 'Done ✓' : 'Next →'}</button>
        </div>
      </div>`;

    cardEl.querySelector('#tourNext').addEventListener('click', function () {
      if (isLast) { endTour(); } else { currentStep++; localStorage.setItem('tour_step', currentStep); renderStep(); }
    });
    const prevBtn = cardEl.querySelector('#tourPrev');
    if (prevBtn) prevBtn.addEventListener('click', function () { currentStep--; localStorage.setItem('tour_step', currentStep); renderStep(); });
    const skipBtn = cardEl.querySelector('#tourSkip');
    if (skipBtn) skipBtn.addEventListener('click', endTour);
  }

  function wireTutorial() {
    const btn = document.getElementById('tourHelpBtn');
    if (btn) btn.addEventListener('click', function () {
      localStorage.removeItem('tour_seen');
      localStorage.removeItem('tour_step');
      startTour(0);
    });

    const path = window.location.pathname.toLowerCase();
    const isPublic = ['login', 'signup'].some(p => path.includes(p));
    if (isPublic) return;

    const savedStep = localStorage.getItem('tour_step');
    if (savedStep !== null) {
      setTimeout(function () { startTour(parseInt(savedStep, 10)); }, 600);
    } else if (!localStorage.getItem('tour_seen')) {
      setTimeout(function () { startTour(0); }, 800);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wireTutorial);
  } else {
    setTimeout(wireTutorial, 100);
  }

})();