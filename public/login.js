async function parseJSON(res) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    if (res.status === 429) throw new Error('Too many requests, please try again later');
    throw new Error('Server error');
  }
}

const loginForm = document.getElementById('loginForm');
const loginMessage = document.getElementById('loginMessage');

document.getElementById('toggleLoginPassword').addEventListener('click', function() {
  const input = document.getElementById('loginPassword');
  const eyeIcon = document.getElementById('loginEyeIcon');
  const eyeOffIcon = document.getElementById('loginEyeOffIcon');
  if (input.type === 'password') {
    input.type = 'text';
    eyeIcon.classList.add('hidden');
    eyeOffIcon.classList.remove('hidden');
  } else {
    input.type = 'password';
    eyeIcon.classList.remove('hidden');
    eyeOffIcon.classList.add('hidden');
  }
});

async function loadCaptcha(form) {
  const svgEl = document.getElementById(form + 'CaptchaSvg');
  const tokenEl = document.getElementById(form + 'CaptchaToken');
  const inputEl = document.getElementById(form + 'CaptchaInput');
  if (!svgEl || !tokenEl) return;
  svgEl.innerHTML ='<span class="captcha-loading">Loading...</span>';
  if (inputEl) inputEl.value = '';
  try {
    const res = await fetch('/api/captcha');
    const data = await parseJSON(res);
    tokenEl.value = data.token;
    svgEl.innerHTML = data.svg;
    svgEl.querySelector('svg').style.width = '100%';
    svgEl.querySelector('svg').style.height = 'auto';
    svgEl.querySelector('svg').style.display = 'block';
  } catch (err) {
    svgEl.innerHTML ='<span class="captcha-error">Load failed, click to retry</span>';
  }
}

function getCaptchaValue(form) {
  const tokenEl = document.getElementById(form + 'CaptchaToken');
  const inputEl = document.getElementById(form + 'CaptchaInput');
  return {
    captchaToken: tokenEl?.value || '',
    captchaInput: inputEl?.value || ''
  };
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginMessage.textContent = '';
  loginMessage.className = 'auth-message';

  const loginBtn = loginForm.querySelector('button[type="submit"]');
  const username = document.getElementById('loginUsername').value;
  const password = document.getElementById('loginPassword').value;

  const captcha = getCaptchaValue('login');

  loginBtn.disabled = true;
  loginBtn.textContent = 'Logging in...';

  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, ...captcha })
    });
    const data = await parseJSON(res);

    if (!res.ok) {
      throw new Error(data.error || 'Login failed');
    }

    localStorage.setItem('token', data.token);
    localStorage.setItem('username', data.username);
    window.location.href ='/dashboard.html';
  } catch (err) {
    loginMessage.textContent = err.message;
    loginMessage.className = 'auth-message error';
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = 'Enter';
  }
});

document.getElementById('refreshLoginCaptchaLink').addEventListener('click', () => loadCaptcha('login'));

loadCaptcha('login');

async function loadUserCount() {
  const el = document.getElementById('userCount');
  if (!el) return;
  try {
    const res = await fetch('/api/stats/users');
    const data = await parseJSON(res);
    if (!res.ok) throw new Error(data.error || 'Error');
    el.textContent = `${data.count} Registered`;
  } catch (err) {
    el.textContent = 'Error';
  }
}

loadUserCount();

// ============================================================
// Admin Panel
// ============================================================
const adminPanel = document.getElementById('adminPanel');
const adminLoginForm = document.getElementById('adminLoginForm');
const adminDashboard = document.getElementById('adminDashboard');
const adminPasswordInput = document.getElementById('adminPassword');
const adminLoginBtn = document.getElementById('adminLoginBtn');
const adminLoginError = document.getElementById('adminLoginError');
const adminUserList = document.getElementById('adminUserList');
const adminNoUsers = document.getElementById('adminNoUsers');
const adminUserListError = document.getElementById('adminUserListError');
const adminAddUserForm = document.getElementById('adminAddUserForm');
const adminAddUserMsg = document.getElementById('adminAddUserMsg');

function openAdminPanel() {
  adminPanel.classList.remove('hidden');
  adminLogout();
}

function closeAdminPanel() {
  adminPanel.classList.add('hidden');
}

function adminLogout() {
  localStorage.removeItem('adminToken');
  showAdminLogin();
}

function showAdminLogin() {
  adminLoginForm.classList.remove('hidden');
  adminDashboard.classList.add('hidden');
  adminPasswordInput.value = '';
  adminLoginError.classList.add('hidden');
  document.getElementById('adminProfanityCheckBtn').classList.add('hidden');
  document.getElementById('adminLogoutBtn').classList.add('hidden');
}

function showAdminDashboard() {
  adminLoginForm.classList.add('hidden');
  adminDashboard.classList.remove('hidden');
  document.getElementById('adminProfanityCheckBtn').classList.remove('hidden');
  document.getElementById('adminLogoutBtn').classList.remove('hidden');
  loadAdminUsers();
  loadRateLimits();
}

async function loadRateLimits() {
  const authCount = document.getElementById('authRateLimitCount');
  const authBar = document.getElementById('authRateLimitBar');
  const authMaxEl = document.getElementById('authRateLimitMax');
  const generalCount = document.getElementById('generalRateLimitCount');
  const generalBar = document.getElementById('generalRateLimitBar');
  const generalMaxEl = document.getElementById('generalRateLimitMax');
  const ipsEl = document.getElementById('rateLimitIps');

  try {
    const data = await adminApi('/rate-limits');

    const authPct = data.auth.max > 0 ? Math.min((data.auth.totalHits / data.auth.max) * 100, 100) : 0;
    authCount.textContent = `${data.auth.totalHits} / ${data.auth.max}`;
    authBar.style.width = `${authPct}%`;
    authBar.className = `progress-bar-fill ${authPct > 80 ? 'red' : authPct > 50 ? 'yellow' : 'green'}`;
    authMaxEl.textContent = data.auth.max;

    const generalPct = data.general.max > 0 ? Math.min((data.general.totalHits / data.general.max) * 100, 100) : 0;
    generalCount.textContent = `${data.general.totalHits} / ${data.general.max}`;
    generalBar.style.width = `${generalPct}%`;
    generalBar.className = `progress-bar-fill ${generalPct > 80 ? 'red' : generalPct > 50 ? 'yellow' : 'blue'}`;
    generalMaxEl.textContent = data.general.max;

    const allIps = [...data.auth.ips, ...data.general.ips];
    const merged = {};
    allIps.forEach(ipData => {
      if (!merged[ipData.ip]) merged[ipData.ip] = { ip: ipData.ip, authHits: 0, generalHits: 0, resetTime: null };
      if (data.auth.ips.find(a => a.ip === ipData.ip)) {
        merged[ipData.ip].authHits = ipData.hits;
        merged[ipData.ip].resetTime = ipData.resetTime;
      }
      if (data.general.ips.find(g => g.ip === ipData.ip)) {
        merged[ipData.ip].generalHits = ipData.hits;
        if (!merged[ipData.ip].resetTime) merged[ipData.ip].resetTime = ipData.resetTime;
      }
    });
    const sortedIps = Object.values(merged).sort((a, b) => (b.authHits + b.generalHits) - (a.authHits + a.generalHits));

    if (sortedIps.length === 0) {
      ipsEl.innerHTML ='<p class="text-white/40 text-xs text-center py-3">No request data yet</p>';
    } else {
      ipsEl.innerHTML = `
        <table class="w-full text-xs">
          <thead class="sticky top-0 bg-white/10">
            <tr class="text-white/60">
              <th class="px-2 py-1 text-left">IP</th>
              <th class="px-2 py-1 text-right">Auth</th>
              <th class="px-2 py-1 text-right">General</th>
              <th class="px-2 py-1 text-right">Resets</th>
            </tr>
          </thead>
          <tbody>
            ${sortedIps.map(ip => `
              <tr class="border-t border-white/5">
                <td class="px-2 py-1 text-white/90">${escapeHtml(ip.ip)}</td>
                <td class="px-2 py-1 text-right text-white/80">${ip.authHits}</td>
                <td class="px-2 py-1 text-right text-white/80">${ip.generalHits}</td>
                <td class="px-2 py-1 text-right text-white/50">${ip.resetTime ? new Date(ip.resetTime).toLocaleTimeString() : '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    }
  } catch (err) {
    authCount.textContent = 'Error';
    generalCount.textContent = 'Error';
  }
}

document.getElementById('closeAdminPanel').addEventListener('click', closeAdminPanel);
document.getElementById('adminBackdrop').addEventListener('click', closeAdminPanel);
document.getElementById('adminLogoutBtn').addEventListener('click', adminLogout);
document.getElementById('refreshRateLimitsBtn').addEventListener('click', loadRateLimits);

document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.shiftKey && e.key === 'A') {
    e.preventDefault();
    if (adminPanel.classList.contains('hidden')) {
      openAdminPanel();
    } else {
      closeAdminPanel();
    }
  }
  if (e.key === 'Escape' && !adminPanel.classList.contains('hidden')) {
    closeAdminPanel();
  }
});

async function adminLogin(password) {
  const res = await fetch('/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password })
  });
  const data = await parseJSON(res);
  if (!res.ok) throw new Error(data.error || 'Login failed');
  localStorage.setItem('adminToken', data.token);
  return data.token;
}

async function adminApi(endpoint, options = {}) {
  const token = localStorage.getItem('adminToken');
  const res = await fetch(`/api/admin${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...(options.headers || {})
    }
  });
  const data = await parseJSON(res);
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

adminLoginBtn.addEventListener('click', async () => {
  const password = adminPasswordInput.value;
  if (!password) return;
  adminLoginBtn.disabled = true;
  adminLoginBtn.textContent = 'Logging in......';
  adminLoginError.classList.add('hidden');
  try {
    await adminLogin(password);
    showAdminDashboard();
  } catch (err) {
    adminLoginError.textContent = err.message;
    adminLoginError.classList.remove('hidden');
  } finally {
    adminLoginBtn.disabled = false;
    adminLoginBtn.textContent = ' Login';
  }
});

adminPasswordInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') adminLoginBtn.click();
});

document.getElementById('adminRefreshUsers').addEventListener('click', loadAdminUsers);

function renderUserTypeBadge(userType) {
  const safeType = escapeHtml(userType || 'normal');
  if (safeType === 'verified') {
    return'<span class="badge badge-verified">Verified</span>';
  }
  if (safeType === 'organization') {
    return'<span class="badge badge-organization">Organization</span>';
  }
  return'<span class="text-white-60 text-xs">Normal</span>';
}

async function loadAdminUsers() {
  adminUserListError.classList.add('hidden');
  adminNoUsers.classList.add('hidden');
  adminUserList.innerHTML ='<tr><td colspan="10" class="text-center text-white-50 py-6">Loading......</td></tr>';
  try {
    const users = await adminApi('/users');
    adminUserList.innerHTML = '';
    if (users.length === 0) {
      adminNoUsers.classList.remove('hidden');
      return;
    }
    users.forEach(user => {
      const tr = document.createElement('tr');
      tr.className = '';
      const created = new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const fullName = user.full_name || '-';
      tr.innerHTML = `
        <td class="text-white-60">${user.id}</td>
        <td>${escapeHtml(user.username)}</td>
        <td class="hidden md:table-cell"><span class="editable-fullname" data-id="${user.id}" data-value="${escapeHtml(fullName)}">${escapeHtml(fullName)}</span></td>
        <td>
          <span class="editable-grade" data-id="${user.id}" data-value="${escapeHtml(user.grade)}">${escapeHtml(user.grade)}</span>
        </td>
        <td>
          <span class="editable-class" data-id="${user.id}" data-value="${escapeHtml(user.class)}">${escapeHtml(user.class)}</span>
        </td>
        <td>${renderUserTypeBadge(user.user_type)}</td>
        <td class="text-white-50 text-xs hidden lg:table-cell">${created}</td>
        <td>
          <span class="text-white-80">${user.warning_count || 0}</span>
          <button class="view-profile-btn ml-1 text-xs text-blue-400 hover:text-blue-300" data-id="${user.id}">Profile</button>
        </td>
        <td class="text-right">
          <button class="admin-edit-btn text-xs text-blue-400 hover:text-blue-300 mr-2" data-id="${user.id}" data-grade="${escapeHtml(user.grade)}" data-class="${escapeHtml(user.class)}" data-user-type="${escapeHtml(user.user_type || 'normal')}">Edit</button>
          <button class="admin-delete-btn text-xs text-red-400 hover:text-red-300" data-username="${escapeHtml(user.username)}">Delete</button>
        </td>
      `;
      adminUserList.appendChild(tr);
    });
    bindUserRowActions();
  } catch (err) {
    adminUserList.innerHTML = '';
    adminUserListError.textContent = err.message;
    adminUserListError.classList.remove('hidden');
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function bindUserRowActions() {
  document.querySelectorAll('.admin-delete-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const username = btn.dataset.username;
      if (!confirm('Sure to delete user "${username}"? This cannot be undone. "${username}"')) return;
      btn.disabled = true;
      btn.textContent = 'Deleting......';
      try {
        await adminApi(`/users/${encodeURIComponent(username)}`, { method: 'DELETE' });
        loadAdminUsers();
      } catch (err) {
        alert('Delete failed: ' + err.message || 'Delete failed');
        btn.disabled = false;
        btn.textContent = ' Delete';
      }
    });
  });

  document.querySelectorAll('.admin-edit-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const tr = btn.closest('tr');
      const grade = tr.querySelector('.editable-grade').textContent.trim();
      const cls = tr.querySelector('.editable-class').textContent.trim();
      const userType = btn.dataset.userType || 'normal';
      const fullNameEl = tr.querySelector('.editable-fullname');
      const fullName = fullNameEl ? fullNameEl.textContent.trim() : '';
      openEditModal(id, grade, cls, userType, fullName);
    });
  });

  document.querySelectorAll('.view-profile-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      openProfileModal(btn.dataset.id);
    });
  });
}

function openEditModal(userId, currentGrade, currentClass, currentUserType, currentFullName) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay z-60';
  modal.innerHTML = `
    <div class="modal-backdrop" id="editModalBackdrop"></div>
    <div class="modal glass-panel rounded-2xl p-6 relative z-10">
      <h3 class="modal-title mb-4">Edit User #${userId}</h3>
      <div class="space-y-4">
        <div class="auth-form-row">
          <label class="form-label-light">Full Name</label>
          <input type="text" id="editFullName" value="${escapeHtml(currentFullName)}" maxlength="100" class="pill-input w-full px-5 py-3 text-base">
        </div>
        <div class="auth-form-row">
          <label class="form-label-light">New password (leave empty to keep current)</label>
          <input type="password" id="editPassword" placeholder="New password" maxlength="20" class="pill-input w-full px-5 py-3 text-base">
        </div>
        <div class="auth-form-row two-col">
          <div>
            <label class="form-label-light">Grade</label>
            <input type="text" id="editGrade" value="${escapeHtml(currentGrade)}" class="pill-input w-full px-5 py-3 text-base">
          </div>
          <div>
            <label class="form-label-light">Class</label>
            <input type="text" id="editClass" value="${escapeHtml(currentClass)}" class="pill-input w-full px-5 py-3 text-base">
          </div>
        </div>
        <div class="auth-form-row">
          <label class="form-label-light text-sm">User Type</label>
          <select id="editUserType" class="pill-input w-full px-5 py-3 text-base bg-transparent">
            <option value="normal" ${currentUserType === 'normal' ? 'selected' : ''}>Normal</option>
            <option value="verified" ${currentUserType === 'verified' ? 'selected' : ''}>Verified</option>
            <option value="organization" ${currentUserType === 'organization' ? 'selected' : ''}>Organization</option>
          </select>
        </div>
      </div>
      <div id="editError" class="auth-message error hidden"></div>
      <div class="auth-link-row">
        <button id="editSave" class="btn-link btn-link-xl" data-id="${userId}">Save Changes</button>
      </div>
      <div class="text-center mt-2">
        <button id="editCancel" class="btn-link text-xs text-white/70 hover:text-white">Cancel</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  const closeModal = () => document.body.removeChild(modal);
  document.getElementById('editModalBackdrop').addEventListener('click', closeModal);
  document.getElementById('editCancel').addEventListener('click', closeModal);

  document.getElementById('editSave').addEventListener('click', async () => {
    const password = document.getElementById('editPassword').value;
    const grade = document.getElementById('editGrade').value;
    const cls = document.getElementById('editClass').value;
    const userType = document.getElementById('editUserType').value;
    const fullName = document.getElementById('editFullName').value;
    const editError = document.getElementById('editError');
    const saveBtn = document.getElementById('editSave');

    editError.classList.add('hidden');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving......';

    const body = {};
    if (password) body.password = password;
    if (grade !== currentGrade) body.grade = grade;
    if (cls !== currentClass) body.class = cls;
    if (userType !== currentUserType) body.user_type = userType;
    if (fullName !== currentFullName) body.full_name = fullName;

    try {
      await adminApi(`/users/${userId}`, {
        method: 'PUT',
        body: JSON.stringify(body)
      });
      closeModal();
      loadAdminUsers();
    } catch (err) {
      editError.textContent = err.message;
      editError.classList.remove('hidden');
      saveBtn.disabled = false;
      saveBtn.textContent = ' Save Changes';
    }
  });
}

async function openProfileModal(userId) {
  try {
    const users = await adminApi('/users');
    const user = users.find(u => u.id == userId);
    if (!user) return;

    const warnings = await adminApi(`/warnings/${userId}`);
    const daysSince = Math.floor((Date.now() - new Date(user.created_at)) / (1000 * 60 * 60 * 24));

    document.getElementById('profileContent').innerHTML = `
      <div class="space-y-4">
        <div class="card space-y-2">
          <p class="form-label-light text-sm">Username</p>
          <p class="text-white font-semibold">${escapeHtml(user.username)}</p>
          <p class="form-label-light text-sm">Grade</p>
          <p class="text-white">${escapeHtml(user.grade)} - Class ${escapeHtml(user.class)}</p>
          <p class="form-label-light text-sm">User Type</p>
          <p>${renderUserTypeBadge(user.user_type)}</p>
          <p class="form-label-light text-sm">Days with OriLink</p>
          <p class="text-white">${daysSince} days</p>
          <p class="form-label-light text-sm">Warning Count</p>
          <p class="text-red-400 font-semibold">${user.warning_count || 0}</p>
        </div>
        ${warnings.length > 0 ? `
          <div>
            <p class="form-label-light text-sm mb-2">Warning History</p>
            ${warnings.map(w => `
              <div class="warning-card">
                <p class="text-white text-xs font-medium">${escapeHtml(w.invitation_title)}</p>
                <p class="text-red-400/70 text-xs">${escapeHtml(w.reason)}</p>
                <p class="text-white/40 text-xs">${new Date(w.created_at).toLocaleDateString()}</p>
              </div>
            `).join('')}
          </div>
        ` :'<p class="text-white-50 text-sm text-center py-4">No warnings</p>'}
      </div>
    `;

    document.getElementById('profileModal').classList.remove('hidden');
  } catch (err) {
    alert('Failed to load profile: ' + err.message);
  }
}

function closeProfileModal() {
  document.getElementById('profileModal').classList.add('hidden');
}

document.getElementById('closeProfileModal').addEventListener('click', closeProfileModal);
document.getElementById('profileBackdrop').addEventListener('click', closeProfileModal);

adminAddUserForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('adminNewUsername').value.trim();
  const password = document.getElementById('adminNewPassword').value;
  const grade = document.getElementById('adminNewGrade').value.trim();
  const cls = document.getElementById('adminNewClass').value.trim();
  const userType = document.getElementById('adminNewUserType').value;

  const msg = adminAddUserMsg;
  msg.className = 'form-message hidden';

  const submitBtn = adminAddUserForm.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Adding......';

  try {
    const data = await adminApi('/users', {
      method: 'POST',
      body: JSON.stringify({ username, password, grade, class: cls, user_type: userType })
    });
    msg.textContent = `User "${data.user.username}" created successfully! "${data.user.username}"`;
    msg.className = 'auth-message';
    adminAddUserForm.reset();
    loadAdminUsers();
  } catch (err) {
    msg.textContent = err.message;
    msg.className = 'auth-message error';
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Add User';
  }
});

const PROFANITY_LIST = [
  'fuck', 'shit', 'bitch', 'ass', 'damn', 'dick', 'pussy', 'bastard', 'crap', 'hell'];

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function highlightProfanity(text) {
  let result = escapeHtml(text);
  let found = [];
  PROFANITY_LIST.forEach(word => {
    const regex = new RegExp(escapeRegExp(word), 'gi');
    if (regex.test(result)) {
      found.push(word);
      result = result.replace(regex, match => `<span class="text-red-400 font-bold bg-red-500-20 px-1 rounded">${match}</span>`);
    }
  });
  return { html: result, flagged: found };
}

function setupProfanityPanelHandlers() {
  const handleWarnDelete = async (e) => {
    const btn = e.target.closest('.warn-delete-btn');
    if (!btn) return;
    const userId = btn.dataset.userId;
    const invitationId = btn.dataset.invitationId;
    const isFromReportedList = !!btn.closest('#reportedList');
    if (!confirm('Warn this user and delete the invitation?')) return;

    btn.disabled = true;
    btn.textContent = 'Processing......';

    try {
      await adminApi('/warn-and-delete', {
        method: 'POST',
        body: JSON.stringify({ userId, invitationId, reason: 'Profanity violation' })
      });
      scanInvitations();
      loadAdminUsers();
      if (isFromReportedList) {
        loadReportedInvitations();
      }
    } catch (err) {
      alert('Failed: ' + err.message);
      btn.disabled = false;
      btn.textContent = 'Warn & Delete';
    }
  };

  document.getElementById('profanityResults').addEventListener('click', handleWarnDelete);
  document.getElementById('reportedList').addEventListener('click', handleWarnDelete);
}

function bindIgnoreButtons() {
  document.querySelectorAll('.ignore-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const invitationId = btn.dataset.invitationId;
      if (!confirm('Ignore and clear all reports for this invitation?')) return;

      btn.disabled = true;
      btn.textContent = 'Ignoring......';

      try {
        await adminApi(`/reports/${invitationId}`, { method: 'DELETE' });
        const card = btn.closest('[data-invitation-id]');
        if (card) card.remove();
        const results = document.getElementById('reportedList');
        if (results.children.length === 0) {
          results.innerHTML ='<p class="text-white/50 text-sm text-center py-4">No reported invitations</p>';
        }
      } catch (err) {
        alert('Failed: ' + err.message);
        btn.disabled = false;
        btn.textContent = 'Ignore';
      }
    });
  });
}

async function scanInvitations() {
  const results = document.getElementById('profanityResults');
  const summary = document.getElementById('profanitySummary');
  const scanBtn = document.getElementById('scanInvitationsBtn');

  scanBtn.disabled = true;
  scanBtn.textContent = 'Scanning......';
  results.innerHTML ='<p class="text-white-50 text-sm text-center py-4">Loading invitations......</p>';
  summary.classList.add('hidden');

  try {
    const invitations = await adminApi('/invitations');

    if (invitations.length === 0) {
      results.innerHTML ='<p class="text-white-50 text-sm text-center py-4">No invitations found.</p>';
      return;
    }

    let flaggedCount = 0;
    let cleanCount = 0;
    let html = '';

    invitations.forEach(inv => {
      const titleCheck = highlightProfanity(inv.title);
      const descCheck = highlightProfanity(inv.description);
      const isFlagged = titleCheck.flagged.length > 0 || descCheck.flagged.length > 0;

      if (isFlagged) {
        flaggedCount++;
        html += `
          <div class="scan-card scan-card-flagged">
            <div class="flex items-center justify-between mb-2">
              <span class="text-white-60 text-xs">@${escapeHtml(inv.username)} · ${new Date(inv.created_at).toLocaleDateString()}</span>
              <span class="badge badge-flagged">⚠️ Flagged</span>
            </div>
            <h4 class="text-white font-semibold text-sm mb-1">${titleCheck.html}</h4>
            <p class="text-white-80 text-xs whitespace-pre-wrap">${descCheck.html}</p>
            <p class="text-red-400-70 text-xs mt-2">Flagged words: ${[...new Set([...titleCheck.flagged, ...descCheck.flagged])].join(',')}</p>
            <button class="warn-delete-btn mt-2 w-full btn bg-red-500-30 hover:bg-red-500-50 text-xs py-1_5" data-user-id="${inv.user_id}" data-invitation-id="${inv.id}">
              Warn & Delete
            </button>
          </div>
        `;
      } else {
        cleanCount++;
        html += `
          <div class="scan-card scan-card-clean">
            <div class="flex items-center justify-between mb-2">
              <span class="text-white-60 text-xs">@${escapeHtml(inv.username)} · ${new Date(inv.created_at).toLocaleDateString()}</span>
              <span class="badge badge-clean">✓ Clean</span>
            </div>
            <h4 class="text-white font-semibold text-sm mb-1">${titleCheck.html}</h4>
            <p class="text-white-80 text-xs whitespace-pre-wrap">${descCheck.html}</p>
          </div>
        `;
      }
    });

    results.innerHTML = html;
    summary.textContent = `Total: ${invitations.length} | Flagged: ${flaggedCount} | Clean: ${cleanCount}`;
    summary.classList.remove('hidden');

  } catch (err) {
    results.innerHTML = `<p class="form-message-error text-sm text-center py-4">Error: ${err.message}</p>`;
  } finally {
    scanBtn.disabled = false;
    scanBtn.textContent = 'Scan Invitations';
  }
}

async function loadReportedInvitations() {
  const results = document.getElementById('reportedList');
  const container = document.getElementById('reportedResults');

  container.classList.remove('hidden');
  results.innerHTML ='<p class="text-white-50 text-sm text-center py-4">Loading......</p>';

  try {
    const reported = await adminApi('/reported');

    if (reported.length === 0) {
      results.innerHTML ='<p class="text-white-50 text-sm text-center py-4">No reported invitations</p>';
      return;
    }

    let html = '';
    reported.forEach(inv => {
      const titleCheck = highlightProfanity(inv.title);
      const descCheck = highlightProfanity(inv.description);
      const reasons = inv.reasons ? inv.reasons.split(' |||').map(r => escapeHtml(r.trim())).filter(Boolean) : [];

      html += `
        <div class="scan-card scan-card-reported" data-invitation-id="${inv.id}">
          <div class="flex items-center justify-between mb-2">
            <span class="text-white-60 text-xs">@${escapeHtml(inv.username)} · ${new Date(inv.created_at).toLocaleDateString()}</span>
            <span class="badge badge-report">⚠️ ${inv.report_count} report${inv.report_count > 1 ? 's' : ''}</span>
          </div>
          <h4 class="text-white font-semibold text-sm mb-1">${titleCheck.html}</h4>
          <p class="text-white-80 text-xs whitespace-pre-wrap">${descCheck.html}</p>
          ${reasons.length > 0 ? `
            <div class="mt-2 mb-2">
              <p class="text-white-60 text-xs mb-1">Report reasons:</p>
              ${reasons.map(r => `<p class="text-yellow-300-80 text-xs ml-2">• ${r}</p>`).join('')}
            </div>
          ` : ''}
          <div class="flex gap-2 mt-2">
            <button class="warn-delete-btn flex-1 btn bg-red-500-30 hover:bg-red-500-50 text-xs py-1_5" data-user-id="${inv.user_id}" data-invitation-id="${inv.id}">
              Warn & Delete
            </button>
            <button class="ignore-btn flex-1 btn bg-gray-500-30 hover:bg-gray-500-50 text-xs py-1_5" data-invitation-id="${inv.id}">
              Ignore
            </button>
          </div>
        </div>
      `;
    });

    results.innerHTML = html;
    bindIgnoreButtons();
  } catch (err) {
    results.innerHTML = `<p class="text-red-400 text-sm text-center py-4">Error: ${err.message}</p>`;
  }
}

document.getElementById('adminProfanityCheckBtn').addEventListener('click', () => {
  document.getElementById('profanityPanel').classList.remove('hidden');
});

document.getElementById('closeProfanityPanel').addEventListener('click', () => {
  document.getElementById('profanityPanel').classList.add('hidden');
});

document.getElementById('profanityBackdrop').addEventListener('click', () => {
  document.getElementById('profanityPanel').classList.add('hidden');
});

document.getElementById('scanInvitationsBtn').addEventListener('click', scanInvitations);

document.getElementById('loadReportedBtn').addEventListener('click', loadReportedInvitations);

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (!document.getElementById('profanityPanel').classList.contains('hidden')) {
      document.getElementById('profanityPanel').classList.add('hidden');
    }
    if (!document.getElementById('profileModal').classList.contains('hidden')) {
      closeProfileModal();
    }
  }
});

setupProfanityPanelHandlers();
