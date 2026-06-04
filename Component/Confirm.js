// ─────────────────────────────────────────────────────────────
// Confirm.js  –  Shared custom confirm modal
// Usage: showConfirm({ title, message, confirmText, type, onConfirm })
// Types: 'danger' (red) | 'warning' (amber) | 'restore' (green) | 'info' (blue)
// ─────────────────────────────────────────────────────────────
(function () {
  const div = document.createElement('div');
  div.innerHTML = `
    <div id="confirmOverlay" style="display:none;position:fixed;inset:0;z-index:10000;
      background:rgba(0,0,0,0.5);backdrop-filter:blur(3px);align-items:center;justify-content:center;">
      <div style="background:#fff;border-radius:16px;padding:28px 24px 22px;
        width:90%;max-width:400px;box-shadow:0 20px 60px rgba(0,0,0,0.22);">
        <div style="display:flex;align-items:flex-start;gap:14px;margin-bottom:6px;">
          <div id="confirmIcon" style="width:42px;height:42px;border-radius:50%;flex-shrink:0;
            display:flex;align-items:center;justify-content:center;"></div>
          <div style="flex:1;">
            <div id="confirmTitle" style="font-size:16px;font-weight:800;color:#111827;margin-bottom:5px;"></div>
            <div id="confirmMsg" style="font-size:13px;color:#6b7280;line-height:1.55;"></div>
          </div>
        </div>
        <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:22px;">
          <button id="confirmCancelBtn" style="padding:9px 20px;border:1.5px solid #e5e7eb;border-radius:8px;
            background:#fff;color:#374151;font-size:14px;font-weight:600;cursor:pointer;">Cancel</button>
          <button id="confirmOkBtn" style="padding:9px 22px;border:none;border-radius:8px;
            font-size:14px;font-weight:700;cursor:pointer;color:#fff;"></button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(div);

  const STYLES = {
    danger:  { bg: '#fee2e2', stroke: '#dc2626', btnBg: '#dc2626',
      icon: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/>' },
    warning: { bg: '#fef3c7', stroke: '#d97706', btnBg: '#d97706',
      icon: '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>' },
    restore: { bg: '#d1fae5', stroke: '#16a34a', btnBg: '#16a34a',
      icon: '<polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.95"/>' },
    info:    { bg: '#dbeafe', stroke: '#2563eb', btnBg: '#2563eb',
      icon: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>' },
  };

  window.showConfirm = function ({ title, message, confirmText = 'Confirm', type = 'danger', onConfirm }) {
    const overlay = document.getElementById('confirmOverlay');
    const s = STYLES[type] || STYLES.danger;

    document.getElementById('confirmIcon').style.background = s.bg;
    document.getElementById('confirmIcon').innerHTML =
      `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${s.stroke}"
        stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">${s.icon}</svg>`;
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmMsg').textContent   = message;

    const okBtn = document.getElementById('confirmOkBtn');
    okBtn.textContent       = confirmText;
    okBtn.style.background  = s.btnBg;

    overlay.style.display = 'flex';

    // Replace buttons to clear old listeners
    const newOk     = okBtn.cloneNode(true);
    const newCancel = document.getElementById('confirmCancelBtn').cloneNode(true);
    okBtn.replaceWith(newOk);
    document.getElementById('confirmCancelBtn').replaceWith(newCancel);

    function close() { overlay.style.display = 'none'; }

    document.getElementById('confirmOkBtn').addEventListener('click', () => { close(); onConfirm(); });
    document.getElementById('confirmCancelBtn').addEventListener('click', close);
    overlay.onclick = (e) => { if (e.target === overlay) close(); };
  };
})();
