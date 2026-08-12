async function parseJSON(res) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    if (res.status === 429) throw new Error('Too many requests, please try again later');
    throw new Error('Server error');
  }
}

const signupForm = document.getElementById('signupForm');
const signupMessage = document.getElementById('signupMessage');

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
  svgEl.innerHTML = '<span class="captcha-loading">Loading...</span>';
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
    svgEl.innerHTML = '<span class="captcha-error">Load failed, click to retry</span>';
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

document.getElementById('refreshSignupCaptchaLink').addEventListener('click', () => loadCaptcha('signup'));

signupForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  signupMessage.textContent = '';
  signupMessage.className = 'auth-message';

  const signupBtn = signupForm.querySelector('button[type="submit"]');
  const fullName = document.getElementById('fullName').value;
  const username = document.getElementById('signupUsername').value;
  const password = document.getElementById('signupPassword').value;
  const confirmPassword = document.getElementById('confirmPassword').value;
  const grade = document.getElementById('grade').value;
  const classNum = document.getElementById('classNum').value;

  const captcha = getCaptchaValue('signup');

  signupBtn.disabled = true;
  signupBtn.textContent = 'Creating account...';

  try {
    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, confirmPassword, fullName, grade, class: classNum, ...captcha })
    });
    const data = await parseJSON(res);

    if (!res.ok) {
      throw new Error(data.error || 'Registration failed');
    }

    localStorage.setItem('token', data.token);
    localStorage.setItem('username', data.username);
    window.location.href = '/dashboard.html';
  } catch (err) {
    signupMessage.textContent = err.message;
    signupMessage.className = 'auth-message error';
  } finally {
    signupBtn.disabled = false;
    signupBtn.textContent = 'Sign Up';
  }
});

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
      const data = await parseJSON(res);

      usernameStatus.classList.remove('hidden');
      if (!res.ok) {
        usernameStatus.textContent = data.error || 'Check failed';
        usernameStatus.className = 'text-xs mt-1 text-red-300';
      } else if (data.available) {
        usernameStatus.textContent = 'Username available';
        usernameStatus.className = 'text-xs mt-1 text-green-300';
      } else {
        usernameStatus.textContent = data.error || 'Username not available';
        usernameStatus.className = 'text-xs mt-1 text-red-300';
      }
    } catch (err) {
      usernameStatus.classList.remove('hidden');
      usernameStatus.textContent = 'Check failed';
      usernameStatus.className = 'text-xs mt-1 text-red-300';
    }
  }, 500);
});

const termsTextContent = `Effective Date: {DATE}

Welcome to the OriLink social platform. By creating an account, you agree to follow these rules. This platform is built for our community, and staying on it is a privilege, not a right.

1. Security and "No Hacking" Policy
We take the security of our community seriously. By using this site, you agree to the following:

No Unauthorized Access: You may not attempt to access, "hack," or bypass any security features of this website. This includes trying to guess passwords, using automated "brute force" tools, or exploiting bugs.

No Data Mining: You are prohibited from using scripts, crawlers, or "scrapers" to extract user data or site content.

Reporting Vulnerabilities: If you find a security flaw or a "glitch," you must report it to the Site Administrator immediately. Exploiting a known flaw for fun or profit will result in an immediate permanent ban and referral to school administration.

Account Integrity: You are responsible for your login credentials. Sharing your password or "lending" your account to others is strictly prohibited.

2. Intellectual Property
This website, including its layout, design, custom code, and graphics, is the property of OriLink.

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
  termsSection.classList.toggle('hidden');
});

loadCaptcha('signup');

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
