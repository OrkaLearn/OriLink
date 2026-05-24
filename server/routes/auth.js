const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../db');

const router = express.Router();

const JWT_SECRET = 'orilink-secret-key-change-in-production';

const USERNAME_REGEX = /^[a-zA-Z][a-zA-Z0-9_.]{0,19}$/;
const PASSWORD_REGEX = /^[a-zA-Z0-9!@#$%^&*()\-_=+\[\]{}|;:' ,./<>?]{5,}$/;

function getAltchaHmacKey(app) {
  return app.locals.altchaHmacKey || process.env.ALTCHA_HMAC_KEY;
}

router.post('/login', async (req, res) => {
  try {
    const { username, password, altcha: altchaField, payload: payloadField } = req.body;
    const altcha = altchaField || payloadField;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const hmacKey = getAltchaHmacKey(req.app);
    console.log('Login - HMAC Key exists:', !!hmacKey);
    console.log('Login - Altcha payload received:', !!altcha);
    console.log('Login - Altcha payload:', altcha ? altcha.substring(0, 50) + '...' : 'null');

    if (hmacKey) {
      if (!altcha) {
        return res.status(400).json({ error: 'ALTCHA verification required - please complete the captcha' });
      }

      const { verifySolution } = require('altcha-lib');
      const verified = await verifySolution(altcha, hmacKey);
      console.log('Login - Altcha verification result:', verified);

      if (!verified) {
        return res.status(400).json({ error: 'ALTCHA verification failed - please try again' });
      }
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

router.post('/register', async (req, res) => {
  try {
    const { username, password, confirmPassword, fullName, grade, class: classNum, altcha: altchaField, payload: payloadField } = req.body;
    const altcha = altchaField || payloadField;

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

    const hmacKey = getAltchaHmacKey(req.app);
    console.log('Register - HMAC Key exists:', !!hmacKey);
    console.log('Register - Altcha payload received:', !!altcha);
    console.log('Register - Altcha payload:', altcha ? altcha.substring(0, 50) + '...' : 'null');

    if (hmacKey) {
      if (!altcha) {
        return res.status(400).json({ error: 'ALTCHA verification required - please complete the captcha' });
      }

      const { verifySolution } = require('altcha-lib');
      const verified = await verifySolution(altcha, hmacKey);
      console.log('Register - Altcha verification result:', verified);

      if (!verified) {
        return res.status(400).json({ error: 'ALTCHA verification failed - please try again' });
      }
    }

    const [existing] = await pool.query('SELECT id FROM users WHERE username = ?', [username]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Username already taken' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

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

module.exports = router;