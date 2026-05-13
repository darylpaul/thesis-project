// ═══════════════════════════════════════════════════
// MINDFUL SCHOOL OF BERLYN ACHIEVERS
// API Configuration — Web Frontend
//
// Change API_URL here whenever ngrok URL changes
// Then refresh all web pages (Ctrl+Shift+R)
// ═══════════════════════════════════════════════════

const CONFIG = {
  // ── CHANGE THIS LINE ONLY ──
  API_URL: 'https://thesis-project-production-0338.up.railway.app/api',

  // Examples:
  // Railway:     'https://thesis-project-production-0338.up.railway.app/api'
  // Local WiFi:  'http://192.168.18.123:3000/api'
  // ngrok:       'https://abc123.ngrok-free.app/api'
  // localhost:   'http://localhost:3000/api'
};

// Make available globally
window.API_URL = CONFIG.API_URL;
console.log('API URL:', window.API_URL);