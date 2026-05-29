const emailVerificationStore = new Map();

const CODE_TTL = 5 * 60 * 1000; // 5 minutes

function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function create(email) {
  const code = generateCode();
  const expiresAt = Date.now() + CODE_TTL;
  emailVerificationStore.set(email, { code, expiresAt });
  return code;
}

function verify(email, input) {
  const entry = emailVerificationStore.get(email);
  if (!entry) {
    return { valid: false, error: 'No verification code found 未找到验证码' };
  }
  if (Date.now() > entry.expiresAt) {
    emailVerificationStore.delete(email);
    return { valid: false, error: 'Verification code expired 验证码已过期' };
  }
  if (entry.code !== input) {
    return { valid: false, error: 'Incorrect verification code 验证码错误' };
  }
  emailVerificationStore.delete(email);
  return { valid: true };
}

module.exports = { create, verify };
