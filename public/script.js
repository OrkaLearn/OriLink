document.addEventListener('DOMContentLoaded', () => {
  const togglePassword = document.getElementById('togglePassword');
  const passwordInput = document.getElementById('password');
  const eyeIcon = document.getElementById('eyeIcon');
  const eyeOffIcon = document.getElementById('eyeOffIcon');
  const loginForm = document.getElementById('loginForm');

  togglePassword.addEventListener('click', () => {
    const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
    passwordInput.setAttribute('type', type);
    eyeIcon.classList.toggle('hidden');
    eyeOffIcon.classList.toggle('hidden');
  });

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const altchaWidget = document.querySelector('altcha-widget');
    const altchaInput = loginForm.querySelector('input[name="altcha"]');

    const widgetState = altchaWidget && altchaWidget.getState ? altchaWidget.getState() : null;
    if (!altchaInput || !altchaInput.value || (altchaWidget && widgetState !== 'verified')) {
      alert('Please complete the ALTCHA verification first.');
      return;
    }

    const submitBtn = loginForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Signing in...';
    submitBtn.disabled = true;

    try {
      const loginData = { username, password, altcha: altchaInput.value };

      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(loginData),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('username', data.username);
        window.location.href = '/dashboard.html';
      } else {
        alert(data.error || 'Login failed');
        if (altchaWidget && altchaWidget.reset) {
          altchaWidget.reset();
        }
      }
    } catch (error) {
      alert('Server error. Please try again later.');
      if (altchaWidget && altchaWidget.reset) {
        altchaWidget.reset();
      }
    } finally {
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    }
  });
});
