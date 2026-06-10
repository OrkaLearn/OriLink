const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const authSwitch = document.getElementById('authSwitch');
const authSwitchLoggedIn = document.getElementById('authSwitchLoggedIn');
const showSignup = document.getElementById('showSignup');
const showLogin = document.getElementById('showLogin');
const loginMessage = document.getElementById('loginMessage');

function showLoginPanel() {
  loginForm.classList.remove('hidden');
  signupForm.classList.add('hidden');
  authSwitch.classList.remove('hidden');
  authSwitchLoggedIn.classList.add('hidden');
  loginMessage.textContent = '';
}

function showSignupPanel() {
  loginForm.classList.add('hidden');
  signupForm.classList.remove('hidden');
  authSwitch.classList.add('hidden');
  authSwitchLoggedIn.classList.remove('hidden');
  loginMessage.textContent = '';
}

function initCaptchas() {
  loadCaptcha('login');
  loadCaptcha('signup');
}

showSignup.addEventListener('click', (e) => {
  e.preventDefault();
  showSignupPanel();
  loadCaptcha('signup');
});

showLogin.addEventListener('click', (e) => {
  e.preventDefault();
  showLoginPanel();
  loadCaptcha('login');
});

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

document.getElementById('toggleSignupPassword').addEventListener('click', function() {
  const input = document.getElementById('signupPassword');
  const eyeIcon = document.getElementById('signupEyeIcon');
  const eyeOffIcon = document.getElementById('signupEyeOffIcon');
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
  svgEl.innerHTML = '<span class="text-white/50 text-sm">Loading... 加载中...</span>';
  if (inputEl) inputEl.value = '';
  try {
    const res = await fetch('/api/captcha');
    const data = await res.json();
    tokenEl.value = data.token;
    svgEl.innerHTML = data.svg;
    svgEl.querySelector('svg').style.width = '100%';
    svgEl.querySelector('svg').style.height = 'auto';
    svgEl.querySelector('svg').style.display = 'block';
  } catch (err) {
    svgEl.innerHTML = '<span class="text-red-400 text-sm">Load failed, click to retry 加载失败，点击重试</span>';
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
  loginMessage.className = 'text-center mt-4 text-sm';
  
  const loginBtn = loginForm.querySelector('button[type="submit"]');
  const username = document.getElementById('loginUsername').value;
  const password = document.getElementById('loginPassword').value;
  
  const captcha = getCaptchaValue('login');

  loginBtn.disabled = true;
  loginBtn.textContent = 'Logging in... 登录中...';

  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, ...captcha })
    });
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Login failed 登录失败');
    }

    localStorage.setItem('token', data.token);
    localStorage.setItem('username', data.username);
    window.location.href = '/dashboard.html';
  } catch (err) {
    loginMessage.textContent = err.message;
    loginMessage.className = 'text-center mt-4 text-sm text-red-400';
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = '登录 Login';
  }
});

signupForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginMessage.textContent = '';
  loginMessage.className = 'text-center mt-4 text-sm';
  
  const signupBtn = signupForm.querySelector('button[type="submit"]');
  const fullName = document.getElementById('fullName').value;
  const username = document.getElementById('signupUsername').value;
  const password = document.getElementById('signupPassword').value;
  const confirmPassword = document.getElementById('confirmPassword').value;
  const grade = document.getElementById('grade').value;
  const classNum = document.getElementById('classNum').value;
  
  const captcha = getCaptchaValue('signup');

  signupBtn.disabled = true;
  signupBtn.textContent = 'Creating account... 创建账号中...';

  try {
    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, confirmPassword, fullName, grade, class: classNum, ...captcha })
    });
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Registration failed 注册失败');
    }

    localStorage.setItem('token', data.token);
    localStorage.setItem('username', data.username);
    window.location.href = '/dashboard.html';
  } catch (err) {
    loginMessage.textContent = err.message;
    loginMessage.className = 'text-center mt-4 text-sm text-red-400';
  } finally {
    signupBtn.disabled = false;
    signupBtn.textContent = '注册 Sign Up';
  }
});

const termsTextContent = `Effective Date: {DATE}

Welcome to the OriLink 元联 social platform. By creating an account, you agree to follow these rules. This platform is built for our community, and staying on it is a privilege, not a right.

1. Security and "No Hacking" Policy
We take the security of our community seriously. By using this site, you agree to the following:

No Unauthorized Access: You may not attempt to access, "hack," or bypass any security features of this website. This includes trying to guess passwords, using automated "brute force" tools, or exploiting bugs.

No Data Mining: You are prohibited from using scripts, crawlers, or "scrapers" to extract user data or site content.

Reporting Vulnerabilities: If you find a security flaw or a "glitch," you must report it to the Site Administrator immediately. Exploiting a known flaw for fun or profit will result in an immediate permanent ban and referral to school administration.

Account Integrity: You are responsible for your login credentials. Sharing your password or "lending" your account to others is strictly prohibited.

2. Intellectual Property
This website, including its layout, design, custom code, and graphics, is the property of OriLink 元联.

No Cloning: You may not copy the source code, CSS, or design elements to create a "clone" or a competing site.

Content Ownership: While you own the posts you make, the "look and feel" of the platform belongs to us. Redistribution of any site assets without written permission is a violation of these terms.

3. User Conduct
Since this is a school-only platform, the school's Student Code of Conduct applies here 24/7.

No Harassment: Cyberbullying, hate speech, and harassment will not be tolerated.

School Use Only: This site is for Shanghai New Epoch Bilingual School students and staff. Do not invite or share access with people outside of our school.

4. Consequences
Failure to follow these rules—especially those regarding hacking or intellectual property theft—may result in:

Immediate account suspension or deletion.

Disciplinary action through the School Administration.

Legal action, if the "hacking" results in data breaches or significant damage to the system.

Note: By clicking "Sign Up," you acknowledge that you have read and agreed to these terms. Stay safe and be respectful!`;

const currentDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
document.getElementById('termsText').textContent = termsTextContent.replace('{DATE}', currentDate);

document.getElementById('showTerms').addEventListener('click', function(e) {
  e.preventDefault();
  const termsSection = document.getElementById('termsSection');
  if (termsSection.classList.contains('hidden')) {
    termsSection.classList.remove('hidden');
  } else {
    termsSection.classList.add('hidden');
  }
});

document.getElementById('refreshLoginCaptchaBtn').addEventListener('click', () => loadCaptcha('login'));
document.getElementById('refreshSignupCaptchaBtn').addEventListener('click', () => loadCaptcha('signup'));

initCaptchas();

let usernameCheckTimeout = null;
const signupUsernameInput = document.getElementById('signupUsername');
const usernameStatus = document.getElementById('usernameStatus');

signupUsernameInput.addEventListener('input', () => {
  clearTimeout(usernameCheckTimeout);
  usernameStatus.classList.add('hidden');
  usernameStatus.textContent = '';

  const username = signupUsernameInput.value.trim();
  if (username.length < 3) return;

  usernameCheckTimeout = setTimeout(async () => {
    try {
      const res = await fetch(`/api/check-username?username=${encodeURIComponent(username)}`);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();

      usernameStatus.classList.remove('hidden');
      if (data.available) {
        usernameStatus.textContent = 'Username available 用户名可用';
        usernameStatus.className = 'text-xs mt-1 text-green-400';
      } else {
        usernameStatus.textContent = data.error || 'Username not available 用户名不可用';
        usernameStatus.className = 'text-xs mt-1 text-red-400';
      }
    } catch (err) {
      usernameStatus.classList.remove('hidden');
      usernameStatus.textContent = 'Check failed 检查失败';
      usernameStatus.className = 'text-xs mt-1 text-red-400';
    }
  }, 500);
});

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
}

document.getElementById('closeAdminPanel').addEventListener('click', closeAdminPanel);
document.getElementById('adminBackdrop').addEventListener('click', closeAdminPanel);
document.getElementById('adminLogoutBtn').addEventListener('click', adminLogout);

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
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Login failed 登录失败');
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
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed 请求失败');
  return data;
}

adminLoginBtn.addEventListener('click', async () => {
  const password = adminPasswordInput.value;
  if (!password) return;
  adminLoginBtn.disabled = true;
  adminLoginBtn.textContent = 'Logging in... 登录中...';
  adminLoginError.classList.add('hidden');
  try {
    await adminLogin(password);
    showAdminDashboard();
  } catch (err) {
    adminLoginError.textContent = err.message;
    adminLoginError.classList.remove('hidden');
  } finally {
    adminLoginBtn.disabled = false;
    adminLoginBtn.textContent = '登录 Login';
  }
});

adminPasswordInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') adminLoginBtn.click();
});

document.getElementById('adminRefreshUsers').addEventListener('click', loadAdminUsers);

async function loadAdminUsers() {
  adminUserListError.classList.add('hidden');
  adminNoUsers.classList.add('hidden');
  adminUserList.innerHTML = '<tr><td colspan="9" class="text-center text-white/50 py-6">Loading... 加载中...</td></tr>';
  try {
    const users = await adminApi('/users');
    adminUserList.innerHTML = '';
    if (users.length === 0) {
      adminNoUsers.classList.remove('hidden');
      return;
    }
    users.forEach(user => {
      const tr = document.createElement('tr');
      tr.className = 'border-t border-white/10 hover:bg-white/5';
      const created = new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const fullName = user.full_name || '-';
      tr.innerHTML = `
        <td class="px-3 py-2 text-white/60">${user.id}</td>
        <td class="px-3 py-2">${escapeHtml(user.username)}</td>
        <td class="px-3 py-2 hidden md:table-cell">${escapeHtml(fullName)}</td>
        <td class="px-3 py-2">
          <span class="editable-grade" data-id="${user.id}" data-value="${escapeHtml(user.grade)}">${escapeHtml(user.grade)}</span>
        </td>
        <td class="px-3 py-2">
          <span class="editable-class" data-id="${user.id}" data-value="${escapeHtml(user.class)}">${escapeHtml(user.class)}</span>
        </td>
        <td class="px-3 py-2 text-white/50 text-xs hidden lg:table-cell">${created}</td>
        <td class="px-3 py-2">
          <span class="text-white/80">${user.warning_count || 0}</span>
          <button class="view-profile-btn ml-1 text-xs text-blue-400 hover:text-blue-300" data-id="${user.id}">Profile 资料</button>
        </td>
        <td class="px-3 py-2 text-right">
          <button class="admin-edit-btn text-xs text-blue-400 hover:text-blue-300 mr-2" data-id="${user.id}" data-grade="${escapeHtml(user.grade)}" data-class="${escapeHtml(user.class)}">Edit 编辑</button>
          <button class="admin-delete-btn text-xs text-red-400 hover:text-red-300" data-username="${escapeHtml(user.username)}">Delete 删除</button>
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
      if (!confirm('Sure to delete user "${username}"? This cannot be undone. 确定删除用户 "${username}"？此操作不可撤销。')) return;
      btn.disabled = true;
      btn.textContent = 'Deleting... 删除中...';
      try {
        await adminApi(`/users/${encodeURIComponent(username)}`, { method: 'DELETE' });
        loadAdminUsers();
      } catch (err) {
        alert('Delete failed: ' + err.message || 'Delete failed 删除失败');
        btn.disabled = false;
        btn.textContent = '删除 Delete';
      }
    });
  });

  document.querySelectorAll('.admin-edit-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const tr = btn.closest('tr');
      const grade = tr.querySelector('.editable-grade').textContent.trim();
      const cls = tr.querySelector('.editable-class').textContent.trim();
      openEditModal(id, grade, cls);
    });
  });

  document.querySelectorAll('.view-profile-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      openProfileModal(btn.dataset.id);
    });
  });
}

function openEditModal(userId, currentGrade, currentClass) {
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 z-[60] flex items-center justify-center p-4';
  modal.innerHTML = `
    <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" id="editModalBackdrop"></div>
    <div class="glass-panel rounded-2xl p-6 w-full max-w-sm relative z-10">
      <h3 class="text-white font-bold text-lg mb-4">Edit User #${userId} 编辑用户</h3>
      <div class="space-y-3">
        <div>
          <label class="block text-white/70 text-xs mb-1">New password (leave empty to keep current) 新密码（留空保持当前密码）</label>
          <input type="password" id="editPassword" placeholder="New password 新密码" maxlength="20" class="input-field w-full px-3 py-2 rounded-lg text-sm">
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-white/70 text-xs mb-1">Grade 年级</label>
            <input type="text" id="editGrade" value="${escapeHtml(currentGrade)}" maxlength="2" class="input-field w-full px-3 py-2 rounded-lg text-sm">
          </div>
          <div>
            <label class="block text-white/70 text-xs mb-1">Class 班级</label>
            <input type="text" id="editClass" value="${escapeHtml(currentClass)}" maxlength="2" class="input-field w-full px-3 py-2 rounded-lg text-sm">
          </div>
        </div>
      </div>
      <div id="editError" class="text-red-400 text-sm mt-2 hidden"></div>
      <div class="flex gap-3 mt-5">
        <button id="editCancel" class="flex-1 py-2 rounded-lg text-sm font-semibold border border-white/30 text-white/70 hover:bg-white/10 transition-colors">Cancel 取消</button>
        <button id="editSave" class="flex-1 py-2 rounded-lg text-sm font-semibold login-btn" data-id="${userId}">Save Changes 保存更改</button>
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
    const editError = document.getElementById('editError');
    const saveBtn = document.getElementById('editSave');

    editError.classList.add('hidden');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving... 保存中...';

    const body = {};
    if (password) body.password = password;
    if (grade !== currentGrade) body.grade = grade;
    if (cls !== currentClass) body.class = cls;

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
      saveBtn.textContent = '保存更改 Save Changes';
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
        <div class="bg-white/5 rounded-lg p-4 space-y-2">
          <p class="text-white/60 text-xs">Username 用户名</p>
          <p class="text-white font-semibold">${escapeHtml(user.username)}</p>
          <p class="text-white/60 text-xs">Grade 年级</p>
          <p class="text-white">${escapeHtml(user.grade)} - Class 班级 ${escapeHtml(user.class)}</p>
          <p class="text-white/60 text-xs">Days with OriLink 加入元联天数</p>
          <p class="text-white">${daysSince} days 天</p>
          <p class="text-white/60 text-xs">Warning Count 警告次数</p>
          <p class="text-red-400 font-semibold">${user.warning_count || 0}</p>
        </div>
        ${warnings.length > 0 ? `
          <div>
            <p class="text-white/60 text-xs mb-2">Warning History 警告记录</p>
            ${warnings.map(w => `
              <div class="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-2">
                <p class="text-white text-xs font-medium">${escapeHtml(w.invitation_title)}</p>
                <p class="text-red-400/70 text-xs">${escapeHtml(w.reason)}</p>
                <p class="text-white/40 text-xs">${new Date(w.created_at).toLocaleDateString()}</p>
              </div>
            `).join('')}
          </div>
        ` : '<p class="text-white/50 text-sm text-center py-4">No warnings 无警告</p>'}
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

  const msg = adminAddUserMsg;
  msg.className = 'text-center text-sm mt-2 hidden';

  const submitBtn = adminAddUserForm.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Adding... 添加中...';

  try {
    const data = await adminApi('/users', {
      method: 'POST',
      body: JSON.stringify({ username, password, grade, class: cls })
    });
    msg.textContent = `User "${data.user.username}" created successfully! 用户 "${data.user.username}" 创建成功！`;
    msg.className = 'text-center text-sm mt-2 text-green-400';
    adminAddUserForm.reset();
    loadAdminUsers();
  } catch (err) {
    msg.textContent = err.message;
    msg.className = 'text-center text-sm mt-2 text-red-400';
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Add User 添加用户';
  }
});

const PROFANITY_LIST = [
  'fuck', 'shit', 'bitch', 'ass', 'damn', 'dick', 'pussy', 'bastard', 'crap', 'hell',
  '操', '他妈的', '傻逼', '草泥马', '日', '贱', '滚', '死', '废物', '脑残'
];

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
      result = result.replace(regex, match => `<span class="text-red-400 font-bold bg-red-500/20 px-1 rounded">${match}</span>`);
    }
  });
  return { html: result, flagged: found };
}

function bindWarnDeleteButtons() {
  document.querySelectorAll('.warn-delete-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const userId = btn.dataset.userId;
      const invitationId = btn.dataset.invitationId;
      if (!confirm('Warn this user and delete the invitation? 警告此用户并删除邀请？')) return;

      btn.disabled = true;
      btn.textContent = 'Processing... 处理中...';

      try {
        await adminApi('/warn-and-delete', {
          method: 'POST',
          body: JSON.stringify({ userId, invitationId, reason: 'Profanity violation 不当内容' })
        });
        scanInvitations();
        loadAdminUsers();
      } catch (err) {
        alert('Failed: ' + err.message);
        btn.disabled = false;
        btn.textContent = 'Warn & Delete 警告并删除';
      }
    });
  });
}

function bindIgnoreButtons() {
  document.querySelectorAll('.ignore-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const invitationId = btn.dataset.invitationId;
      if (!confirm('Ignore and clear all reports for this invitation? 忽略并清除此邀请的所有举报？')) return;

      btn.disabled = true;
      btn.textContent = 'Ignoring... 忽略中...';

      try {
        await adminApi(`/reports/${invitationId}`, { method: 'DELETE' });
        const card = btn.closest('[data-invitation-id]');
        if (card) card.remove();
        const results = document.getElementById('reportedList');
        if (results.children.length === 0) {
          results.innerHTML = '<p class="text-white/50 text-sm text-center py-4">No reported invitations 暂无被举报邀请</p>';
        }
      } catch (err) {
        alert('Failed: ' + err.message);
        btn.disabled = false;
        btn.textContent = 'Ignore 忽略';
      }
    });
  });
}

async function scanInvitations() {
  const results = document.getElementById('profanityResults');
  const summary = document.getElementById('profanitySummary');
  const scanBtn = document.getElementById('scanInvitationsBtn');

  scanBtn.disabled = true;
  scanBtn.textContent = 'Scanning... 扫描中...';
  results.innerHTML = '<p class="text-white/50 text-sm text-center py-4">Loading invitations... 加载邀请中...</p>';
  summary.classList.add('hidden');

  try {
    const invitations = await adminApi('/invitations');

    if (invitations.length === 0) {
      results.innerHTML = '<p class="text-white/50 text-sm text-center py-4">No invitations found. 暂无邀请。</p>';
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
          <div class="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
            <div class="flex items-center justify-between mb-2">
              <span class="text-white/60 text-xs">@${escapeHtml(inv.username)} · ${new Date(inv.created_at).toLocaleDateString()}</span>
              <span class="px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/30 text-red-300">⚠️ Flagged 标记</span>
            </div>
            <h4 class="text-white font-semibold text-sm mb-1">${titleCheck.html}</h4>
            <p class="text-white/80 text-xs whitespace-pre-wrap">${descCheck.html}</p>
            <p class="text-red-400/70 text-xs mt-2">Flagged words: ${[...new Set([...titleCheck.flagged, ...descCheck.flagged])].join(', ')}</p>
            <button class="warn-delete-btn mt-2 w-full py-1.5 rounded-lg bg-red-500/30 hover:bg-red-500/50 text-white text-xs font-medium transition-all" data-user-id="${inv.user_id}" data-invitation-id="${inv.id}">
              Warn & Delete 警告并删除
            </button>
          </div>
        `;
      } else {
        cleanCount++;
        html += `
          <div class="mb-4 p-3 rounded-lg bg-white/5 border border-white/10">
            <div class="flex items-center justify-between mb-2">
              <span class="text-white/60 text-xs">@${escapeHtml(inv.username)} · ${new Date(inv.created_at).toLocaleDateString()}</span>
              <span class="px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400">✓ Clean 正常</span>
            </div>
            <h4 class="text-white font-semibold text-sm mb-1">${titleCheck.html}</h4>
            <p class="text-white/80 text-xs whitespace-pre-wrap">${descCheck.html}</p>
          </div>
        `;
      }
    });

    results.innerHTML = html;
    bindWarnDeleteButtons();
    summary.textContent = `Total 总计: ${invitations.length} | Flagged 标记: ${flaggedCount} | Clean 正常: ${cleanCount}`;
    summary.classList.remove('hidden');

  } catch (err) {
    results.innerHTML = `<p class="text-red-400 text-sm text-center py-4">Error: ${err.message}</p>`;
  } finally {
    scanBtn.disabled = false;
    scanBtn.textContent = 'Scan Invitations 扫描邀请';
  }
}

async function loadReportedInvitations() {
  const results = document.getElementById('reportedList');
  const container = document.getElementById('reportedResults');

  container.classList.remove('hidden');
  results.innerHTML = '<p class="text-white/50 text-sm text-center py-4">Loading... 加载中...</p>';

  try {
    const reported = await adminApi('/reported');

    if (reported.length === 0) {
      results.innerHTML = '<p class="text-white/50 text-sm text-center py-4">No reported invitations 暂无被举报邀请</p>';
      return;
    }

    let html = '';
    reported.forEach(inv => {
      const titleCheck = highlightProfanity(inv.title);
      const descCheck = highlightProfanity(inv.description);
      const reasons = inv.reasons ? inv.reasons.split(' ||| ').map(r => escapeHtml(r.trim())).filter(Boolean) : [];

      html += `
        <div class="mb-3 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30" data-invitation-id="${inv.id}">
          <div class="flex items-center justify-between mb-2">
            <span class="text-white/60 text-xs">@${escapeHtml(inv.username)} · ${new Date(inv.created_at).toLocaleDateString()}</span>
            <span class="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-500/30 text-yellow-300">⚠️ ${inv.report_count} report${inv.report_count > 1 ? 's' : ''} 举报</span>
          </div>
          <h4 class="text-white font-semibold text-sm mb-1">${titleCheck.html}</h4>
          <p class="text-white/80 text-xs whitespace-pre-wrap">${descCheck.html}</p>
          ${reasons.length > 0 ? `
            <div class="mt-2 mb-2">
              <p class="text-white/60 text-xs mb-1">Report reasons 举报原因:</p>
              ${reasons.map(r => `<p class="text-yellow-300/80 text-xs ml-2">• ${r}</p>`).join('')}
            </div>
          ` : ''}
          <div class="flex gap-2 mt-2">
            <button class="warn-delete-btn flex-1 py-1.5 rounded-lg bg-red-500/30 hover:bg-red-500/50 text-white text-xs font-medium transition-all" data-user-id="${inv.user_id}" data-invitation-id="${inv.id}">
              Warn & Delete 警告并删除
            </button>
            <button class="ignore-btn flex-1 py-1.5 rounded-lg bg-gray-500/30 hover:bg-gray-500/50 text-white text-xs font-medium transition-all" data-invitation-id="${inv.id}">
              Ignore 忽略
            </button>
          </div>
        </div>
      `;
    });

    results.innerHTML = html;
    bindWarnDeleteButtons();
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

async function loadUserCount() {
  const el = document.getElementById('userCount');
  if (!el) return;
  try {
    const res = await fetch('/api/stats/users');
    const data = await res.json();
    el.textContent = `${data.count} Registered Users 注册用户`;
  } catch (err) {
    el.textContent = 'Error 错误';
  }
}

loadUserCount();
