const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../db');
const captchaStore = require('../captcha-store');

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;

const USERNAME_REGEX = /^[a-zA-Z][a-zA-Z0-9_.]{0,19}$/;
const PASSWORD_REGEX = /^[a-zA-Z0-9!@#$%^&*()\-_=+\[\]{}|;:' ,./<>?]{5,}$/;

router.post('/login', async (req, res) => {
  try {
    const { username, password, captchaToken, captchaInput } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    if (!captchaToken || !captchaInput) {
      return res.status(400).json({ error: 'CAPTCHA verification required' });
    }

    if (!captchaStore.verify(captchaToken, captchaInput)) {
      return res.status(400).json({ error: 'Captcha failed, please refresh the captcha and try again' });
    }

    const [users] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);

    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = users[0];
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ token, username: user.username });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/extend', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized 未授权' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ error: 'Token expired or invalid 令牌已过期或无效' });
    }

    const [users] = await pool.query('SELECT id, username FROM users WHERE id = ?', [decoded.id]);
    if (users.length === 0) {
      return res.status(401).json({ error: 'User not found 用户未找到' });
    }

    const newToken = jwt.sign(
      { id: users[0].id, username: users[0].username },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ token: newToken });
  } catch (error) {
    console.error('Extend token error:', error);
    res.status(500).json({ error: 'Server error 服务器错误' });
  }
});

router.get('/check-username', async (req, res) => {
  try {
    const { username } = req.query;

    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }

    if (!USERNAME_REGEX.test(username)) {
      return res.json({ available: false, error: 'Username must start with a letter and contain only letters, numbers, underscores, or periods (max 20 characters) 用户名必须以字母开头，仅限字母/数字/下划线/点（最多20个字符）' });
    }

    const [existing] = await pool.query('SELECT id FROM users WHERE username = ?', [username]);
    if (existing.length > 0) {
      return res.json({ available: false, error: 'Username already taken 用户名已被占用' });
    }

    res.json({ available: true });
  } catch (error) {
    console.error('Check username error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/register', async (req, res) => {
  try {
    const { username, password, confirmPassword, fullName, grade, class: classNum, captchaToken, captchaInput } = req.body;

    if (!username || !password || !confirmPassword || !fullName || !grade || !classNum) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    if (!USERNAME_REGEX.test(username)) {
      return res.status(400).json({ error: 'Username must start with a letter and contain only letters, numbers, underscores, or periods (max 20 characters)' });
    }

    if (!PASSWORD_REGEX.test(password)) {
      return res.status(400).json({ error: 'Password must be at least 5 characters and contain only letters, numbers, and common symbols' });
    }

    const gradeNum = parseInt(grade, 10);
    const classNumInt = parseInt(classNum, 10);
    if (isNaN(gradeNum) || gradeNum < 9 || gradeNum > 12) {
      return res.status(400).json({ error: 'Grade must be between 9 and 12' });
    }
    if (isNaN(classNumInt) || classNumInt < 1 || classNumInt > 10) {
      return res.status(400).json({ error: 'Class must be between 1 and 10' });
    }

    const nameValue = fullName ? fullName.trim() : '';
    
    if (!nameValue || nameValue.length < 2) {
      return res.status(400).json({ error: 'Please enter your full name' });
    }

    if (!captchaToken || !captchaInput) {
      return res.status(400).json({ error: 'CAPTCHA verification required' });
    }

    if (!captchaStore.verify(captchaToken, captchaInput)) {
      return res.status(400).json({ error: 'Captcha failed, please refresh the captcha and try again' });
    }

    const [existing] = await pool.query('SELECT id FROM users WHERE username = ?', [username]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Username already taken' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await pool.query(
      'INSERT INTO users (username, password, full_name, grade, class) VALUES (?, ?, ?, ?, ?)',
      [username, hashedPassword, nameValue, grade, classNum]
    );

    const [newUser] = await pool.query('SELECT id FROM users WHERE username = ?', [username]);

    const token = jwt.sign(
      { id: newUser[0].id, username: username },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ token, username });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/stats/users', async (req, res) => {
  try {
    const [result] = await pool.query('SELECT COUNT(*) as count FROM users');
    res.json({ count: result[0].count });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;