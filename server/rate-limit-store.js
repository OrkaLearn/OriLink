const { MemoryStore } = require('express-rate-limit');

const authStore = new MemoryStore();
const generalStore = new MemoryStore();

const AUTH_LIMITER_MAX = 200;
const GENERAL_LIMITER_MAX = 100;

module.exports = { authStore, generalStore, AUTH_LIMITER_MAX, GENERAL_LIMITER_MAX };