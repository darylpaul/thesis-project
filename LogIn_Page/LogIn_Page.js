// ===========================
// TOGGLE PASSWORD VISIBILITY
// ===========================
const togglePw = document.getElementById('togglePw');
const passwordInput = document.getElementById('password');
const eyeIcon = document.getElementById('eyeIcon');

togglePw.addEventListener('click', () => {
  const isPassword = passwordInput.type === 'password';
  passwordInput.type = isPassword ? 'text' : 'password';
  eyeIcon.innerHTML = isPassword
    ? `<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
       <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
       <line x1="1" y1="1" x2="23" y2="23"/>`
    : `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
       <circle cx="12" cy="12" r="3"/>`;
});

// ===========================
// FORM VALIDATION & SUBMIT
// ===========================
const loginForm     = document.getElementById('loginForm');
const emailInput    = document.getElementById('email');
const emailError    = document.getElementById('emailError');
const passwordError = document.getElementById('passwordError');
const loginBtn      = document.getElementById('loginBtn');

function validateEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}
function showError(input, errorEl, message) {
  input.classList.add('input-error');
  errorEl.textContent = message;
}
function clearError(input, errorEl) {
  input.classList.remove('input-error');
  errorEl.textContent = '';
}

emailInput.addEventListener('input',    () => clearError(emailInput, emailError));
passwordInput.addEventListener('input', () => clearError(passwordInput, passwordError));

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  let valid = true;

  if (!emailInput.value.trim()) {
    showError(emailInput, emailError, 'Email is required.'); valid = false;
  } else if (!validateEmail(emailInput.value)) {
    showError(emailInput, emailError, 'Please enter a valid email address.'); valid = false;
  } else { clearError(emailInput, emailError); }

  if (!passwordInput.value) {
    showError(passwordInput, passwordError, 'Password is required.'); valid = false;
  } else if (passwordInput.value.length < 8) {
    showError(passwordInput, passwordError, 'Password must be at least 8 characters.'); valid = false;
  } else { clearError(passwordInput, passwordError); }

  if (!valid) return;

  loginBtn.textContent = 'Logging in…';
  loginBtn.disabled    = true;

  try {
    const res  = await fetch(`${window.API_URL || 'http://localhost:3000/api'}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailInput.value.trim(), password: passwordInput.value })
    });
    const data = await res.json();
    if (res.ok) {
      localStorage.setItem('token',    data.token);
      localStorage.setItem('fullname', data.fullname || 'User');
      localStorage.setItem('email',    emailInput.value.trim());
      // Detect gender from name prefix
      const fn = data.fullname || '';
      if (/^Ms\./i.test(fn) || /^Mrs\./i.test(fn)) localStorage.setItem('gender', 'female');
      else if (/^Mr\./i.test(fn)) localStorage.setItem('gender', 'male');
      else localStorage.setItem('gender', '');
      window.location.href = '../Dashboard_Page/Dashboard_Page.html';
    } else {
      showError(emailInput, emailError, data.error || 'Invalid credentials.');
    }
  } catch {
    alert('Could not connect to server. Make sure your backend is running.');
  } finally {
    loginBtn.textContent = 'Log In';
    loginBtn.disabled    = false;
  }
});

// ===========================
// HELP MODAL
// ===========================
const helpBackdrop  = document.getElementById('helpBackdrop');
const helpBtn       = document.getElementById('helpBtn');
const helpModalClose = document.getElementById('helpModalClose');
const helpModalOk   = document.getElementById('helpModalOk');

function openHelp()  { helpBackdrop.classList.add('open'); }
function closeHelp() { helpBackdrop.classList.remove('open'); }

helpBtn.addEventListener('click', openHelp);
helpModalClose.addEventListener('click', closeHelp);
helpModalOk.addEventListener('click', closeHelp);
helpBackdrop.addEventListener('click', (e) => { if (e.target === helpBackdrop) closeHelp(); });