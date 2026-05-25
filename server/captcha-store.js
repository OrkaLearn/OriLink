const crypto = require('crypto');

const store = new Map();

const TTL_MS = 5 * 60 * 1000;

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

function create(answer) {
  const token = generateToken();
  const expiresAt = Date.now() + TTL_MS;
  store.set(token, { answer: answer.toLowerCase(), expiresAt });
  return token;
}

function verify(token, input) {
  if (!token || !input) return false;
  const entry = store.get(token);
  if (!entry) return false;
  if (Date.now() > entry.expiresAt) {
    store.delete(token);
    return false;
  }
  const valid = entry.answer === input.toLowerCase();
  store.delete(token);
  return valid;
}

function cleanup() {
  const now = Date.now();
  for (const [token, entry] of store.entries()) {
    if (now > entry.expiresAt) {
      store.delete(token);
    }
  }
}

setInterval(cleanup, 60 * 1000);

module.exports = { create, verify, cleanup };
