const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const jwt = require('jsonwebtoken');
const xss = require('xss');

const INVITATION_TYPES = ['play/sports', 'teammate finding', 'tutoring', 'other'];
const MAX_TITLE_LENGTH = 100;
const MAX_DESCRIPTION_LENGTH = 300;
const MAX_ACTIVE_INVITATIONS = 4;

const SORT_OPTIONS = {
  newest: 'i.created_at DESC',
  event: 'i.event_start IS NULL, i.event_start ASC'
};

const MY_SORT_OPTIONS = {
  newest: 'created_at DESC',
  event: 'event_start IS NULL, event_start ASC'
};

let io;

function setSocketIO(socketIO) {
  io = socketIO;
}

function getUserIdFromToken(authHeader) {
  return new Promise((resolve, reject) => {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      resolve(null);
      return;
    }
    const token = authHeader.substring(7);
    try {
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      resolve(decoded.id);
    } catch (err) {
      resolve(null);
    }
  });
}

router.get('/invitations', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const currentUserId = await getUserIdFromToken(authHeader);
    const sort = SORT_OPTIONS[req.query.sort] || SORT_OPTIONS.event;

    let query = `
      SELECT i.id, i.title, i.description, i.type, i.max_participants, i.event_start, i.event_end, i.created_at, u.username, u.personality_type,
        (SELECT COUNT(*) FROM joined_invitations ji WHERE ji.invitation_id = i.id) as joined_count
      FROM invitations i
      JOIN users u ON i.user_id = u.id
    `;
    let params = [];

    if (currentUserId) {
      query += ' WHERE i.user_id != ? AND (i.event_end IS NULL OR i.event_end >= NOW())';
      params.push(currentUserId);
    } else {
      query += ' WHERE i.event_end IS NULL OR i.event_end >= NOW()';
    }

    query += ` ORDER BY ${sort}`;

    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching invitations:', err);
    res.status(500).json({ error: 'Failed to fetch invitations' });
  }
});

router.get('/my-invitations', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const currentUserId = await getUserIdFromToken(authHeader);
    const sort = MY_SORT_OPTIONS[req.query.sort] || MY_SORT_OPTIONS.event;

    if (!currentUserId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const [rows] = await pool.query(
      `SELECT invitations.id, invitations.title, invitations.description, invitations.type, invitations.max_participants, invitations.event_start, invitations.event_end, invitations.created_at, u.personality_type,
        (SELECT COUNT(*) FROM joined_invitations ji WHERE ji.invitation_id = invitations.id) as joined_count
      FROM invitations
      JOIN users u ON invitations.user_id = u.id
      WHERE user_id = ? AND (event_end IS NULL OR event_end >= NOW()) ORDER BY ${sort}`,
      [currentUserId]
    );
    res.json(rows);
  } catch (err) {
    console.error('Error fetching my invitations:', err);
    res.status(500).json({ error: 'Failed to fetch invitations' });
  }
});

router.post('/invitations', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const currentUserId = await getUserIdFromToken(authHeader);

    if (!currentUserId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const [countResult] = await pool.query(
      'SELECT COUNT(*) as count FROM invitations WHERE user_id = ? AND (event_end IS NULL OR event_end >= NOW())',
      [currentUserId]
    );
    if (countResult[0].count >= MAX_ACTIVE_INVITATIONS) {
      return res.status(400).json({ error: `You can only have ${MAX_ACTIVE_INVITATIONS} active invitations at a time 您最多只能同时发布${MAX_ACTIVE_INVITATIONS}个邀请` });
    }

    const { title, description, type, max_participants, event_start, event_end } = req.body;

    if (!title || !description || !type) {
      return res.status(400).json({ error: 'Title, description, and type are required' });
    }

    if (title.length > MAX_TITLE_LENGTH) {
      return res.status(400).json({ error: `Title must be ${MAX_TITLE_LENGTH} characters or less` });
    }

    if (description.length > MAX_DESCRIPTION_LENGTH) {
      return res.status(400).json({ error: `Description must be ${MAX_DESCRIPTION_LENGTH} characters or less` });
    }

    if (!INVITATION_TYPES.includes(type)) {
      return res.status(400).json({ error: 'Invalid invitation type' });
    }

    const participants = parseInt(max_participants) || 1;
    if (participants < 1 || participants > 10) {
      return res.status(400).json({ error: 'max_participants must be between 1 and 10' });
    }

    let startTime = null;
    let endTime = null;

    if (event_start) {
      startTime = new Date(event_start);
      if (isNaN(startTime.getTime())) {
        return res.status(400).json({ error: 'Invalid event_start date' });
      }
    }

    if (event_end) {
      endTime = new Date(event_end);
      if (isNaN(endTime.getTime())) {
        return res.status(400).json({ error: 'Invalid event_end date' });
      }
    }

    if (startTime && startTime <= new Date()) {
      return res.status(400).json({ error: 'event_start must be in the future' });
    }

    if (startTime && endTime && endTime <= startTime) {
      return res.status(400).json({ error: 'event_end must be after event_start' });
    }

    if (startTime && endTime && (endTime - startTime) > 24 * 60 * 60 * 1000) {
      return res.status(400).json({ error: 'Event duration cannot exceed 24 hours 活动时长不能超过24小时' });
    }

    const [result] = await pool.query(
      'INSERT INTO invitations (user_id, title, description, type, max_participants, event_start, event_end) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [currentUserId, title, description, type, participants, startTime, endTime]
    );

    res.json({ id: result.insertId, message: 'Invitation created successfully' });
  } catch (err) {
    console.error('Error creating invitation:', err);
    res.status(500).json({ error: 'Failed to create invitation' });
  }
});

router.post('/invitations/:id/join', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const currentUserId = await getUserIdFromToken(authHeader);

    if (!currentUserId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const invitationId = req.params.id;

    const [rows] = await pool.query(
      'SELECT id, user_id, max_participants FROM invitations WHERE id = ?',
      [invitationId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Invitation not found' });
    }

    const invitation = rows[0];

    if (invitation.user_id === currentUserId) {
      return res.status(400).json({ error: 'You cannot join your own invitation' });
    }

    const [joinCheck] = await pool.query(
      'SELECT id FROM joined_invitations WHERE user_id = ? AND invitation_id = ?',
      [currentUserId, invitationId]
    );

    if (joinCheck.length > 0) {
      return res.status(400).json({ error: 'You have already joined this invitation' });
    }

    const [joinedCountResult] = await pool.query(
      'SELECT COUNT(*) as count FROM joined_invitations WHERE invitation_id = ?',
      [invitationId]
    );
    const joinedCount = joinedCountResult[0].count;

    if (invitation.max_participants && joinedCount >= invitation.max_participants) {
      return res.status(400).json({ error: 'Invitation is full' });
    }

    await pool.query(
      'INSERT INTO joined_invitations (user_id, invitation_id) VALUES (?, ?)',
      [currentUserId, invitationId]
    );

    if (io) {
      io.to(`invitation:${invitationId}`).emit('user_joined', {
        invitationId: parseInt(invitationId),
        userId: currentUserId,
        username: req.body.username || 'User'
      });
    }

    res.json({ message: 'Joined invitation successfully' });
  } catch (err) {
    console.error('Error joining invitation:', err);
    res.status(500).json({ error: 'Failed to join invitation' });
  }
});

router.post('/invitations/:id/report', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const currentUserId = await getUserIdFromToken(authHeader);

    if (!currentUserId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const invitationId = req.params.id;
    const { reason } = req.body;

    if (!reason || !reason.trim()) {
      return res.status(400).json({ error: 'Report reason is required 举报时必须提供原因' });
    }

    const sanitizedReason = xss(reason.trim(), {
      whiteList: {},
      stripIgnoreTag: true,
      stripIgnoreTagBody: ['script']
    });

    if (!sanitizedReason || sanitizedReason.length > 500) {
      return res.status(400).json({ error: 'Report reason must be between 1 and 500 characters 举报原因必须在1到500个字符之间' });
    }

    const [rows] = await pool.query(
      'SELECT id, user_id FROM invitations WHERE id = ?',
      [invitationId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Invitation not found' });
    }

    if (rows[0].user_id === currentUserId) {
      return res.status(400).json({ error: 'Cannot report your own invitation' });
    }

    try {
      await pool.query(
        'INSERT INTO reported_invitations (invitation_id, reporter_id, reason) VALUES (?, ?, ?)',
        [invitationId, currentUserId, sanitizedReason]
      );
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({ error: 'You have already reported this invitation' });
      }
      throw err;
    }

    res.json({ message: 'Invitation reported successfully' });
  } catch (err) {
    console.error('Error reporting invitation:', err);
    res.status(500).json({ error: 'Failed to report invitation' });
  }
});

router.delete('/invitations/:id', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const currentUserId = await getUserIdFromToken(authHeader);

    if (!currentUserId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const invitationId = req.params.id;

    const [rows] = await pool.query(
      'SELECT id, user_id FROM invitations WHERE id = ?',
      [invitationId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Invitation not found' });
    }

    if (rows[0].user_id !== currentUserId) {
      return res.status(403).json({ error: 'You can only delete your own invitations' });
    }

    await pool.query('DELETE FROM invitations WHERE id = ?', [invitationId]);

    res.json({ message: 'Invitation deleted successfully' });
  } catch (err) {
    console.error('Error deleting invitation:', err);
    res.status(500).json({ error: 'Failed to delete invitation' });
  }
});

router.get('/invitations/joined', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const currentUserId = await getUserIdFromToken(authHeader);
    const sort = SORT_OPTIONS[req.query.sort] || SORT_OPTIONS.event;

    if (!currentUserId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const [rows] = await pool.query(
      `SELECT i.id, i.title, i.description, i.type, i.max_participants, i.event_start, i.event_end, i.created_at, u.username, u.personality_type,
        (SELECT COUNT(*) FROM joined_invitations ji WHERE ji.invitation_id = i.id) as joined_count
      FROM invitations i
      JOIN joined_invitations ji ON i.id = ji.invitation_id
      JOIN users u ON i.user_id = u.id
      WHERE ji.user_id = ? AND (i.event_end IS NULL OR i.event_end >= NOW())
      ORDER BY ${sort}`,
      [currentUserId]
    );
    res.json(rows);
  } catch (err) {
    console.error('Error fetching joined invitations:', err);
    res.status(500).json({ error: 'Failed to fetch joined invitations' });
  }
});

router.post('/messages/:invitationId', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const currentUserId = await getUserIdFromToken(authHeader);

    if (!currentUserId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const invitationId = req.params.invitationId;
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Message content is required' });
    }

    const sanitizedContent = xss(content.trim(), {
      whiteList: {},
      stripIgnoreTag: true,
      stripIgnoreTagBody: ['script']
    });

    if (!sanitizedContent) {
      return res.status(400).json({ error: 'Message content cannot be empty after sanitization' });
    }

    const [invCheck] = await pool.query(
      `SELECT i.id FROM invitations i
       LEFT JOIN joined_invitations ji ON i.id = ji.invitation_id
       WHERE i.id = ? AND (i.user_id = ? OR ji.user_id = ?)`,
      [invitationId, currentUserId, currentUserId]
    );

    if (invCheck.length === 0) {
      return res.status(403).json({ error: 'You must be part of this invitation to send messages' });
    }

    const [userResult] = await pool.query('SELECT username FROM users WHERE id = ?', [currentUserId]);
    const username = userResult[0]?.username || 'User';

    await pool.query(
      'INSERT INTO messages (invitation_id, user_id, content) VALUES (?, ?, ?)',
      [invitationId, currentUserId, sanitizedContent]
    );

    if (io) {
      io.to(`invitation:${invitationId}`).emit('new_message', {
        invitationId: parseInt(invitationId),
        userId: currentUserId,
        username: username,
        content: sanitizedContent,
        created_at: new Date().toISOString()
      });
    }

    res.json({ message: 'Message sent successfully' });
  } catch (err) {
    console.error('Error sending message:', err);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

router.get('/messages/:invitationId', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const currentUserId = await getUserIdFromToken(authHeader);

    if (!currentUserId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const invitationId = req.params.invitationId;

    const [invCheck] = await pool.query(
      `SELECT i.id FROM invitations i
       LEFT JOIN joined_invitations ji ON i.id = ji.invitation_id
       WHERE i.id = ? AND (i.user_id = ? OR ji.user_id = ?)`,
      [invitationId, currentUserId, currentUserId]
    );

    if (invCheck.length === 0) {
      return res.status(403).json({ error: 'You must be part of this invitation to view messages' });
    }

    const [rows] = await pool.query(
      `SELECT m.id, m.content, m.created_at, u.id as user_id, u.username
       FROM messages m
       JOIN users u ON m.user_id = u.id
       WHERE m.invitation_id = ?
       ORDER BY m.created_at ASC`,
      [invitationId]
    );
    res.json(rows);
  } catch (err) {
    console.error('Error fetching messages:', err);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

function cleanupExpiredInvitations() {
  setInterval(async () => {
    try {
      const [result] = await pool.query(
        'DELETE FROM invitations WHERE event_end IS NOT NULL AND event_end < NOW()'
      );
      if (result.affectedRows > 0) {
        console.log(`Deleted ${result.affectedRows} expired invitations`);
      }
    } catch (err) {
      console.error('Error cleaning up expired invitations:', err);
    }
  }, 60000);
}

module.exports = { router, setSocketIO, cleanupExpiredInvitations };
