const express = require('express');
const bcrypt = require('bcryptjs');
const { pool } = require('../db');

const router = express.Router();

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '0IsIs//';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'orilink-admin-token-change-in-production';

const USERNAME_REGEX = /^[a-zA-Z][a-zA-Z0-9_.]{0,19}$/;
const PASSWORD_REGEX = /^[a-zA-Z0-9!@#$%^&*()\-_=+\[\]{}|;:' ,./<>?]{5,}$/;

function authenticateAdmin(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Admin authentication required' });
  }

  if (token !== ADMIN_TOKEN) {
    return res.status(403).json({ error: 'Invalid admin token' });
  }

  next();
}

router.post('/login', async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'Password required' });
    }

    if (password !== ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Invalid admin password' });
    }

    res.json({ token: ADMIN_TOKEN });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/users', authenticateAdmin, async (req, res) => {
  try {
    const [users] = await pool.query(
      'SELECT id, username, full_name, grade, class, personality_type, created_at FROM users ORDER BY id'
    );
    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/users', authenticateAdmin, async (req, res) => {
  try {
    const { username, password, grade, class: classNum } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
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

    const hashedPassword = await bcrypt.hash(password, 10);

    await pool.query(
      'INSERT INTO users (username, password, full_name, grade, class) VALUES (?, ?, ?, ?, ?)',
      [username, hashedPassword, '', gradeNum, classNumInt]
    );

    const [newUser] = await pool.query('SELECT id, username, full_name, grade, class, personality_type, created_at FROM users WHERE username = ?', [username]);

    res.json({ message: 'User created successfully', user: newUser[0] });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Username already taken' });
    }
    console.error('Add user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/users/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { password, grade, class: classNum } = req.body;

    const [users] = await pool.query('SELECT id FROM users WHERE id = ?', [id]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const updates = [];
    const params = [];

    if (password) {
      if (!PASSWORD_REGEX.test(password)) {
        return res.status(400).json({ error: 'Password must be at least 5 characters and contain only letters, numbers, and common symbols' });
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      updates.push('password = ?');
      params.push(hashedPassword);
    }

    if (grade !== undefined) {
      const gradeNum = parseInt(grade, 10);
      if (isNaN(gradeNum) || gradeNum < 9 || gradeNum > 12) {
        return res.status(400).json({ error: 'Grade must be between 9 and 12' });
      }
      updates.push('grade = ?');
      params.push(gradeNum);
    }

    if (classNum !== undefined) {
      const classNumInt = parseInt(classNum, 10);
      if (isNaN(classNumInt) || classNumInt < 1 || classNumInt > 10) {
        return res.status(400).json({ error: 'Class must be between 1 and 10' });
      }
      updates.push('class = ?');
      params.push(classNumInt);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(id);

    await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);

    const [updatedUser] = await pool.query('SELECT id, username, full_name, grade, class, personality_type, created_at FROM users WHERE id = ?', [id]);

    res.json({ message: 'User updated successfully', user: updatedUser[0] });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/users/:username', authenticateAdmin, async (req, res) => {
  try {
    const { username } = req.params;

    const [result] = await pool.query('DELETE FROM users WHERE username = ?', [username]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: `User '${username}' deleted successfully` });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;