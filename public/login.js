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
  svgEl.innerHTML = '<span class="text-white/50 text-sm">加载中...</span>';
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
  console.log('Login - CAPTCHA token:', !!captcha.captchaToken);

  loginBtn.disabled = true;
  loginBtn.textContent = 'Logging in... 登录中...';

  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, ...captcha })
    });
    const data = await res.json();
    
    console.log('Login - Response:', res.status, data);

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
  console.log('Signup - CAPTCHA token:', !!captcha.captchaToken);

  signupBtn.disabled = true;
  signupBtn.textContent = 'Creating account... 创建账号中...';

  try {
    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, confirmPassword, fullName, grade, class: classNum, ...captcha })
    });
    const data = await res.json();
    
    console.log('Signup - Response:', res.status, data);

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
  if (localStorage.getItem('adminToken')) {
    showAdminDashboard();
  } else {
    showAdminLogin();
  }
}

function closeAdminPanel() {
  adminPanel.classList.add('hidden');
}

function showAdminLogin() {
  adminLoginForm.classList.remove('hidden');
  adminDashboard.classList.add('hidden');
  adminPasswordInput.value = '';
  adminLoginError.classList.add('hidden');
}

function showAdminDashboard() {
  adminLoginForm.classList.add('hidden');
  adminDashboard.classList.remove('hidden');
  loadAdminUsers();
}

document.getElementById('closeAdminPanel').addEventListener('click', closeAdminPanel);
document.getElementById('adminBackdrop').addEventListener('click', closeAdminPanel);

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
  if (!res.ok) throw new Error(data.error || '请求失败');
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
  adminUserList.innerHTML = '<tr><td colspan="7" class="text-center text-white/50 py-6">加载中...</td></tr>';
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
        <td class="px-3 py-2 text-right">
          <button class="admin-edit-btn text-xs text-blue-400 hover:text-blue-300 mr-2" data-id="${user.id}">编辑</button>
          <button class="admin-delete-btn text-xs text-red-400 hover:text-red-300" data-username="${escapeHtml(user.username)}">删除</button>
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
        alert('Delete failed: ' + err.message || '删除失败');
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
