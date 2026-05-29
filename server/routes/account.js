const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../db');

const router = express.Router();

const JWT_SECRET = 'orilink-secret-key-change-in-production';

const USERNAME_REGEX = /^[a-zA-Z][a-zA-Z0-9_.]{0,19}$/;
const PASSWORD_REGEX = /^[a-zA-Z0-9!@#$%^&*()\-_=+\[\]{}|;:' ,./<>?]{5,}$/;

const MBTI_TYPES = [
  'INFJ', 'INFP', 'INTJ', 'INTP', 
  'ISFJ', 'ISFP', 'ISTJ', 'ISTP',
  'ENFJ', 'ENFP', 'ENTJ', 'ENTP',
  'ESFJ', 'ESFP', 'ESTJ', 'ESTP'
];

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
}

router.get('/account', authenticateToken, async (req, res) => {
  try {
    const [users] = await pool.query(
      'SELECT id, username, full_name, grade, class, personality_type, email, email_verified, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(users[0]);
  } catch (error) {
    console.error('Get account error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/account', authenticateToken, async (req, res) => {
  try {
    const { username, password, personality_type, currentPassword } = req.body;
    
    const [users] = await pool.query('SELECT password FROM users WHERE id = ?', [req.user.id]);
    
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const isValidPassword = await bcrypt.compare(currentPassword, users[0].password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }
    
    const updates = [];
    const params = [];
    
    if (username) {
      if (!USERNAME_REGEX.test(username)) {
        return res.status(400).json({ error: 'Username must start with a letter and contain only letters, numbers, underscores, or periods (max 20 characters)' });
      }
      
      const [existing] = await pool.query(
        'SELECT id FROM users WHERE username = ? AND id != ?',
        [username, req.user.id]
      );
      
      if (existing.length > 0) {
        return res.status(400).json({ error: 'Username already taken' });
      }
      
      updates.push('username = ?');
      params.push(username);
    }
    
    if (password) {
      if (!PASSWORD_REGEX.test(password)) {
        return res.status(400).json({ error: 'Password must be at least 5 characters and contain only letters, numbers, and common symbols' });
      }
      
      const hashedPassword = await bcrypt.hash(password, 10);
      updates.push('password = ?');
      params.push(hashedPassword);
    }
    
    if (personality_type) {
      if (!MBTI_TYPES.includes(personality_type)) {
        return res.status(400).json({ error: 'Invalid personality type' });
      }
      updates.push('personality_type = ?');
      params.push(personality_type);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    params.push(req.user.id);
    
    await pool.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      params
    );
    
    res.json({ message: 'Account updated successfully' });
  } catch (error) {
    console.error('Update account error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
