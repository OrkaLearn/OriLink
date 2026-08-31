const express = require('express');
const bcrypt = require('bcryptjs');
const { pool } = require('../db');
const { authStore, generalStore, AUTH_LIMITER_MAX, GENERAL_LIMITER_MAX } = require('../rate-limit-store');

const router = express.Router();

const ADMIN_TOKEN = process.env.ADMIN_TOKEN;

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

    const isValid = await bcrypt.compare(password, process.env.ADMIN_PASSWORD_HASH);
    if (!isValid) {
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
      'SELECT id, username, full_name, grade, class, personality_type, user_type, warning_count, created_at FROM users ORDER BY id'
    );
    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/users', authenticateAdmin, async (req, res) => {
  try {
    const { username, password, grade, class: classNum, user_type } = req.body;

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
    if (isNaN(gradeNum)) {
      return res.status(400).json({ error: 'Grade must be a valid number' });
    }
    if (isNaN(classNumInt)) {
      return res.status(400).json({ error: 'Class must be a valid number' });
    }

    const validTypes = ['normal', 'verified', 'organization'];
    const userTypeValue = user_type && validTypes.includes(user_type) ? user_type : 'normal';

    const hashedPassword = await bcrypt.hash(password, 12);

    await pool.query(
      'INSERT INTO users (username, password, grade, class, user_type) VALUES (?, ?, ?, ?, ?)',
      [username, hashedPassword, gradeNum, classNumInt, userTypeValue]
    );

    const [newUser] = await pool.query('SELECT id, username, full_name, grade, class, personality_type, user_type, warning_count, created_at FROM users WHERE username = ?', [username]);

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
    const { password, grade, class: classNum, user_type, full_name } = req.body;

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
      const hashedPassword = await bcrypt.hash(password, 12);
      updates.push('password = ?');
      params.push(hashedPassword);
    }

    if (grade !== undefined) {
      const gradeNum = parseInt(grade, 10);
      if (isNaN(gradeNum)) {
        return res.status(400).json({ error: 'Grade must be a valid number' });
      }
      updates.push('grade = ?');
      params.push(gradeNum);
    }

    if (classNum !== undefined) {
      const classNumInt = parseInt(classNum, 10);
      if (isNaN(classNumInt)) {
        return res.status(400).json({ error: 'Class must be a valid number' });
      }
      updates.push('class = ?');
      params.push(classNumInt);
    }

    if (user_type) {
      const validTypes = ['normal', 'verified', 'organization'];
      if (!validTypes.includes(user_type)) {
        return res.status(400).json({ error: 'Invalid user type. Must be normal, verified, or organization' });
      }
      updates.push('user_type = ?');
      params.push(user_type);
    }

    if (full_name !== undefined) {
      const trimmedName = full_name.trim();
      if (trimmedName.length < 2 || trimmedName.length > 100) {
        return res.status(400).json({ error: 'Full name must be between 2 and 100 characters2100' });
      }
      updates.push('full_name = ?');
      params.push(trimmedName);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(id);

    await pool.query(`UPDATE users SET ${updates.join(',')} WHERE id = ?`, params);

    const [updatedUser] = await pool.query('SELECT id, username, full_name, grade, class, personality_type, user_type, warning_count, created_at FROM users WHERE id = ?', [id]);

    res.json({ message: 'User updated successfully', user: updatedUser[0] });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/invitations', authenticateAdmin, async (req, res) => {
  try {
    const [invitations] = await pool.query(
      `SELECT i.id, i.title, i.description, i.type, i.max_participants,
              i.event_start, i.event_end, i.created_at, i.user_id,
              u.username
       FROM invitations i
       JOIN users u ON i.user_id = u.id
       ORDER BY i.created_at DESC`
    );
    res.json(invitations);
  } catch (error) {
    console.error('Get invitations error:', error);
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

router.post('/warn-and-delete', authenticateAdmin, async (req, res) => {
  try {
    const { userId, invitationId, reason } = req.body;

    const [inv] = await pool.query('SELECT id, title, user_id FROM invitations WHERE id = ?', [invitationId]);
    if (inv.length === 0) {
      return res.status(404).json({ error: 'Invitation not found' });
    }

    const title = inv[0].title;
    const actualUserId = inv[0].user_id;

    await pool.query('UPDATE users SET warning_count = warning_count + 1 WHERE id = ?', [actualUserId]);

    await pool.query(
      'INSERT INTO warnings (user_id, invitation_id, invitation_title, reason) VALUES (?, ?, ?, ?)',
      [actualUserId, invitationId, title, reason || 'Profanity violation']
    );

    await pool.query('DELETE FROM invitations WHERE id = ?', [invitationId]);

    res.json({ message: 'Warning issued and invitation deleted' });
  } catch (error) {
    console.error('Warn and delete error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/reported', authenticateAdmin, async (req, res) => {
  try {
    const [reported] = await pool.query(
      `SELECT i.id, i.title, i.description, i.type, i.max_participants,
              i.event_start, i.event_end, i.created_at, i.user_id,
              u.username,
              COUNT(r.id) as report_count,
              GROUP_CONCAT(r.reason SEPARATOR ' |||') as reasons
       FROM reported_invitations r
       JOIN invitations i ON r.invitation_id = i.id
       JOIN users u ON i.user_id = u.id
       GROUP BY i.id
       ORDER BY report_count DESC, i.created_at DESC`
    );
    res.json(reported);
  } catch (error) {
    console.error('Get reported invitations error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/reports/:invitationId', authenticateAdmin, async (req, res) => {
  try {
    const { invitationId } = req.params;

    const [result] = await pool.query(
      'DELETE FROM reported_invitations WHERE invitation_id = ?',
      [invitationId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }

    res.json({ message: 'Report ignored and cleared successfully' });
  } catch (error) {
    console.error('Ignore report error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/warnings/:userId', authenticateAdmin, async (req, res) => {
  try {
    const [warnings] = await pool.query(
      'SELECT id, invitation_id, invitation_title, reason, created_at FROM warnings WHERE user_id = ? ORDER BY created_at DESC',
      [req.params.userId]
    );
    res.json(warnings);
  } catch (error) {
    console.error('Get warnings error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/rate-limits', authenticateAdmin, (req, res) => {
  try {
    const getStoreData = (store, max) => {
      const clientMap = store.current;
      let totalHits = 0;
      const ips = [];

      if (clientMap && clientMap instanceof Map) {
        for (const [ip, data] of clientMap.entries()) {
          if (data && typeof data === 'object' && typeof data.totalHits === 'number') {
            totalHits += data.totalHits;
            ips.push({ ip, hits: data.totalHits, resetTime: data.resetTime ? new Date(data.resetTime).toISOString() : null });
          }
        }
      }

      ips.sort((a, b) => b.hits - a.hits);

      return { totalHits, max, ips };
    };

    res.json({
      auth: getStoreData(authStore, AUTH_LIMITER_MAX),
      general: getStoreData(generalStore, GENERAL_LIMITER_MAX),
    });
  } catch (error) {
    console.error('Get rate limits error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
