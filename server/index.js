const express = require('express');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');
const http = require('http');
const os = require('os');
const { Server } = require('socket.io');
const { initDatabase } = require('./db');
const authRoutes = require('./routes/auth');
const accountRoutes = require('./routes/account');
const invitationRoutes = require('./routes/invitations');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = 3000;

const ALTCHA_HMAC_KEY = crypto.randomBytes(32).toString('hex');

app.use(cors());
app.use(express.json());

app.use('/api', authRoutes);
app.use('/api', accountRoutes);
const { router: invitationRouter, setSocketIO, cleanupExpiredInvitations } = invitationRoutes;
app.use('/api', invitationRouter);

// Serve static files from /public only, not the repo root
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/api/altcha/challenge', async (req, res) => {
  const { createChallenge } = require('altcha-lib');
  const challenge = await createChallenge({ hmacKey: ALTCHA_HMAC_KEY });
  res.json(challenge);
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'login.html'));
});

app.locals.altchaHmacKey = ALTCHA_HMAC_KEY;

setSocketIO(io);

const { pool } = require('./db');

async function verifyUserMembership(userId, invitationId) {
  try {
    const [rows] = await pool.query(
      `SELECT i.id FROM invitations i
       LEFT JOIN joined_invitations ji ON i.id = ji.invitation_id
       WHERE i.id = ? AND (i.user_id = ? OR ji.user_id = ?)`,
      [invitationId, userId, userId]
    );
    return rows.length > 0;
  } catch (err) {
    console.error('Error verifying membership:', err);
    return false;
  }
}

function extractUserIdFromToken(authHeader) {
  return new Promise((resolve) => {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      resolve(null);
      return;
    }
    const token = authHeader.substring(7);
    try {
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, 'orilink-secret-key-change-in-production');
      resolve(decoded.id);
    } catch (err) {
      resolve(null);
    }
  });
}

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  let authenticatedUserId = null;

  socket.on('authenticate', async (token) => {
    if (token) {
      authenticatedUserId = await extractUserIdFromToken('Bearer ' + token);
      console.log(`Socket ${socket.id} authenticated as user ${authenticatedUserId}`);
    }
  });

  socket.on('join_invitation', async (invitationId) => {
    if (!authenticatedUserId) {
      console.log(`Socket ${socket.id} denied: not authenticated`);
      socket.emit('error', { message: 'Authentication required' });
      return;
    }

    const isMember = await verifyUserMembership(authenticatedUserId, invitationId);
    if (!isMember) {
      console.log(`Socket ${socket.id} denied: not a member of invitation ${invitationId}`);
      socket.emit('error', { message: 'You must be part of this invitation to join the chat' });
      return;
    }

    socket.join(`invitation:${invitationId}`);
    console.log(`Socket ${socket.id} joined invitation:${invitationId}`);
  });

  socket.on('leave_invitation', (invitationId) => {
    socket.leave(`invitation:${invitationId}`);
    console.log(`Socket ${socket.id} left invitation:${invitationId}`);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

async function startServer() {
  try {
    await initDatabase();
    console.log('Database initialized');

    cleanupExpiredInvitations();
    console.log('Auto-cleanup for expired invitations started');

    server.listen(PORT, '0.0.0.0', () => {
      const networkInterfaces = os.networkInterfaces();
      let localIp = 'localhost';
      for (const name of Object.keys(networkInterfaces)) {
        for (const iface of networkInterfaces[name]) {
          if (iface.family === 'IPv4' && !iface.internal) {
            localIp = iface.address;
            break;
          }
        }
      }
      console.log(`Server running at http://localhost:${PORT}`);
      console.log(`Server running at http://${localIp}:${PORT}`);
      console.log(`Login page: http://localhost:${PORT}/login.html`);
      console.log(`Login page: http://${localIp}:${PORT}/login.html`);
      console.log(`ALTCHA HMAC key: ${ALTCHA_HMAC_KEY.substring(0, 8)}...`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();