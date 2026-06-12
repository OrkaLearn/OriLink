require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const http = require('http');
const os = require('os');
const { Server } = require('socket.io');
const { initDatabase } = require('./db');
const authRoutes = require('./routes/auth');
const accountRoutes = require('./routes/account');
const invitationRoutes = require('./routes/invitations');
const adminRoutes = require('./routes/admin');
const captchaStore = require('./captcha-store');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'http://ori.nekko.cn',
    methods: ['GET', 'POST']
  }
});

const PORT = 3210;

app.use(helmet({
  crossOriginOpenerPolicy: false,
  originAgentCluster: false,
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      "upgrade-insecure-requests": null,
    }
  }
}));
app.use(cors({ origin: 'http://ori.nekko.cn' }));
app.use(express.json());

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many authentication attempts, please try again later 登录尝试次数过多，请稍后再试',
  standardHeaders: true,
  legacyHeaders: false,
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests, please try again later 请求次数过多，请稍后再试',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/login', authLimiter);
app.use('/api/register', authLimiter);
app.use('/api/admin/login', authLimiter);
app.use('/api', generalLimiter);

app.use('/api', authRoutes);
app.use('/api', accountRoutes);
const { router: invitationRouter, setSocketIO, cleanupExpiredInvitations } = invitationRoutes;
app.use('/api', invitationRouter);
app.use('/api/admin', adminRoutes);

app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/api/captcha', (req, res) => {
  const svgCaptcha = require('svg-captcha');
  const captcha = svgCaptcha.create({
    size: 4,
    ignoreChars: '0oO1iIlL',
    noise: 3,
    color: true,
    background: 'rgba(255,255,255,0.15)',
    fontPath: undefined,
  });
  const token = captchaStore.create(captcha.text);
  res.json({ svg: captcha.data, token });
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'login.html'));
});

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
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
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
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();