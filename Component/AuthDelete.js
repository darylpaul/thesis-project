// =====================================================
// AuthDelete.js - Password + Reason + Archive system
// Usage: requireAuthThenDelete(name, table, id, data, cb)
// =====================================================
(function () {
  const div = document.createElement('div');
  div.innerHTML = `
    <div id="authDeleteOverlay" style="display:none;position:fixed;inset:0;z-index:9999;
      background:rgba(0,0,0,0.55);backdrop-filter:blur(3px);align-items:center;justify-content:center;">
      <div style="background:#fff;border-radius:16px;padding:28px 24px;width:90%;max-width:420px;
        box-shadow:0 20px 60px rgba(0,0,0,0.25);">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px;">
          <div style="width:42px;height:42px;border-radius:50%;background:#fee2e2;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2.5">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
              <path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
            </svg>
          </div>
          <div style="flex:1;">
            <div style="font-size:16px;font-weight:800;color:#111827;">Delete and Archive</div>
            <div style="font-size:12px;color:#9ca3af;margin-top:2px;">Admin can restore from the dashboard</div>
          </div>
          <button onclick="closeAuthDelete()" style="background:none;border:none;font-size:22px;color:#9ca3af;cursor:pointer;">x</button>
        </div>

        <div style="background:#fef2f2;border:1.5px solid #fecaca;border-radius:8px;padding:10px 14px;margin-bottom:14px;font-size:13px;color:#dc2626;line-height:1.5;">
          Deleting: <strong id="authDeleteItemName"></strong><br/>
          <span style="font-size:11px;color:#6b7280;">Admin can restore this from the dashboard.</span>
        </div>

        <label style="font-size:12px;font-weight:700;color:#374151;display:block;margin-bottom:5px;">Reason for deleting *</label>
        <select id="authDeleteReason" onchange="toggleCustomReason(this.value)"
          style="width:100%;padding:10px 12px;border:1.5px solid #d1d5db;border-radius:8px;font-size:13px;background:#fff;outline:none;margin-bottom:8px;box-sizing:border-box;">
          <option value="">Select a reason</option>
          <option value="Duplicate entry">Duplicate entry</option>
          <option value="Wrong information entered">Wrong information entered</option>
          <option value="Student transferred">Student transferred</option>
          <option value="Section dissolved">Section dissolved</option>
          <option value="Subject removed from curriculum">Subject removed from curriculum</option>
          <option value="Exam cancelled">Exam cancelled</option>
          <option value="Record entered by mistake">Record entered by mistake</option>
          <option value="Other">Other (specify below)</option>
        </select>
        <textarea id="authDeleteCustomReason" placeholder="Describe the reason..."
          style="display:none;width:100%;padding:10px 12px;border:1.5px solid #d1d5db;border-radius:8px;
          font-size:13px;resize:vertical;min-height:60px;outline:none;box-sizing:border-box;font-family:inherit;margin-bottom:8px;"></textarea>

        <label style="font-size:12px;font-weight:700;color:#374151;display:block;margin-bottom:5px;">Your Password *</label>
        <div style="position:relative;margin-bottom:6px;">
          <input type="password" id="authDeletePassword" placeholder="Enter your account password"
            onkeydown="if(event.key==='Enter') submitAuthDelete()"
            style="width:100%;padding:10px 40px 10px 12px;border:1.5px solid #d1d5db;border-radius:8px;font-size:14px;outline:none;box-sizing:border-box;"
            onfocus="this.style.borderColor='#1a2eaa'" onblur="this.style.borderColor='#d1d5db'" />
          <span onclick="toggleAuthPw()" style="position:absolute;right:12px;top:50%;transform:translateY(-50%);cursor:pointer;font-size:15px;color:#9ca3af;">o</span>
        </div>
        <div id="authDeleteError" style="font-size:12px;color:#dc2626;min-height:16px;margin-bottom:12px;"></div>

        <div style="display:flex;gap:10px;">
          <button onclick="closeAuthDelete()" style="flex:1;padding:10px;border:1.5px solid #d1d5db;border-radius:8px;background:#fff;font-size:14px;font-weight:600;color:#374151;cursor:pointer;">Cancel</button>
          <button id="authDeleteBtn" onclick="submitAuthDelete()" style="flex:1;padding:10px;border:none;border-radius:8px;background:#dc2626;color:#fff;font-size:14px;font-weight:700;cursor:pointer;">Delete and Archive</button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(div);

  let _cb = null, _table = null, _id = null, _data = null;

  window.requireAuthThenDelete = function (itemName, table, itemId, itemData, callback) {
    _cb = callback; _table = table; _id = itemId; _data = itemData;
    document.getElementById('authDeleteItemName').textContent = itemName;
    document.getElementById('authDeletePassword').value = '';
    document.getElementById('authDeleteReason').value = '';
    document.getElementById('authDeleteCustomReason').value = '';
    document.getElementById('authDeleteCustomReason').style.display = 'none';
    document.getElementById('authDeleteError').textContent = '';
    document.getElementById('authDeleteBtn').textContent = 'Delete and Archive';
    document.getElementById('authDeleteBtn').disabled = false;
    document.getElementById('authDeleteOverlay').style.display = 'flex';
    setTimeout(() => document.getElementById('authDeleteReason').focus(), 100);
  };

  window.toggleCustomReason = function (val) {
    const el = document.getElementById('authDeleteCustomReason');
    el.style.display = val === 'Other' ? 'block' : 'none';
    if (val === 'Other') el.focus();
  };

  window.closeAuthDelete = function () {
    document.getElementById('authDeleteOverlay').style.display = 'none';
    _cb = null; _table = null; _id = null; _data = null;
  };

  window.toggleAuthPw = function () {
    const i = document.getElementById('authDeletePassword');
    i.type = i.type === 'password' ? 'text' : 'password';
  };

  window.submitAuthDelete = async function () {
    const password = document.getElementById('authDeletePassword').value;
    const sel = document.getElementById('authDeleteReason').value;
    const custom = document.getElementById('authDeleteCustomReason').value.trim();
    const reason = sel === 'Other' ? custom : sel;
    const errEl = document.getElementById('authDeleteError');
    const btn = document.getElementById('authDeleteBtn');
    const API = window.API_URL || 'http://localhost:3000/api';
    const token = localStorage.getItem('token') || '';

    if (!reason) { errEl.textContent = 'Please select a reason.'; return; }
    if (sel === 'Other' && !custom) { errEl.textContent = 'Please describe the reason.'; return; }
    if (!password) { errEl.textContent = 'Please enter your password.'; return; }

    btn.textContent = 'Verifying...'; btn.disabled = true; errEl.textContent = '';

    try {
      // Step 1: Verify password
      const vRes = await fetch(`${API}/verify-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': token },
        body: JSON.stringify({ password })
      });
      const vData = await vRes.json();
      if (!vRes.ok || !vData.verified) {
        errEl.textContent = 'Incorrect password. Try again.';
        btn.textContent = 'Delete and Archive'; btn.disabled = false;
        document.getElementById('authDeletePassword').value = '';
        document.getElementById('authDeletePassword').focus();
        return;
      }

      // Step 2: Archive
      btn.textContent = 'Archiving...';
      const aRes = await fetch(`${API}/archive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': token },
        body: JSON.stringify({
          table: _table, item_id: _id,
          item_name: document.getElementById('authDeleteItemName').textContent,
          item_data: _data, reason
        })
      });
      if (aRes.ok) {
        window.closeAuthDelete();
        if (_cb) _cb();
      } else {
        const aData = await aRes.json();
        errEl.textContent = aData.error || 'Could not archive.';
        btn.textContent = 'Delete and Archive'; btn.disabled = false;
      }
    } catch {
      errEl.textContent = 'Server error. Check connection.';
      btn.textContent = 'Delete and Archive'; btn.disabled = false;
    }
  };

  document.getElementById('authDeleteOverlay').addEventListener('click', function(e) {
    if (e.target === this) window.closeAuthDelete();
  });
})();