// ═══════════════════════════════════════════════════
// MINDFUL SCHOOL OF BERLYN ACHIEVERS
// API Configuration — Web Frontend
//
// Change API_URL here whenever ngrok URL changes
// Then refresh all web pages (Ctrl+Shift+R)
// ═══════════════════════════════════════════════════

const isLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname);

window.API_URL = isLocal
  ? 'http://localhost:3000/api'
  : 'https://thesis-project-production-0338.up.railway.app/api';

console.log('API URL:', window.API_URL);