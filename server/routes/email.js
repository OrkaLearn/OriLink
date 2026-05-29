const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const jwt = require('jsonwebtoken');
const emailStore = require('../email-store');

const JWT_SECRET = 'orilink-secret-key-change-in-production';
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

router.post('/email/send-code', authenticateToken, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !EMAIL_REGEX.test(email)) {
      return res.status(400).json({ error: 'Valid email address is required 请输入有效的邮箱地址' });
    }

    const code = emailStore.create(email);

    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      return res.status(500).json({ error: 'Email service not configured 邮件服务未配置' });
    }

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'OriLink 元联 <onboarding@resend.dev>',
        to: [email],
        subject: 'OriLink Email Verification 元联邮箱验证',
        html: `
          <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto;">
            <h2 style="color: #333;">OriLink Email Verification 元联邮箱验证</h2>
            <p>Your verification code is 您的验证码是:</p>
            <h1 style="color: #4F46E5; letter-spacing: 8px; font-size: 32px;">${code}</h1>
            <p style="color: #666;">This code expires in 5 minutes. 此验证码将在5分钟后过期。</p>
          </div>
        `,
      }),
    });

    if (!resendResponse.ok) {
      const errorData = await resendResponse.json();
      console.error('Resend API error:', errorData);
      return res.status(500).json({ error: 'Failed to send verification email 发送验证邮件失败' });
    }

    await pool.query('UPDATE users SET email = ? WHERE id = ?', [email, req.user.id]);

    res.json({ message: 'Verification code sent 验证码已发送' });
  } catch (err) {
    console.error('Send code error:', err);
    res.status(500).json({ error: 'Failed to send verification code 发送验证码失败' });
  }
});

router.post('/email/verify-code', authenticateToken, async (req, res) => {
  try {
    const { code } = req.body;
    if (!code || code.length !== 6) {
      return res.status(400).json({ error: '6-digit verification code is required 请输入6位验证码' });
    }

    const [users] = await pool.query('SELECT email FROM users WHERE id = ?', [req.user.id]);
    if (users.length === 0 || !users[0].email) {
      return res.status(400).json({ error: 'No email address found. Please enter your email first 未找到邮箱地址，请先输入邮箱' });
    }

    const result = emailStore.verify(users[0].email, code);
    if (!result.valid) {
      return res.status(400).json({ error: result.error });
    }

    await pool.query('UPDATE users SET email_verified = TRUE WHERE id = ?', [req.user.id]);

    res.json({ message: 'Email verified successfully 邮箱验证成功' });
  } catch (err) {
    console.error('Verify code error:', err);
    res.status(500).json({ error: 'Failed to verify email 验证邮箱失败' });
  }
});

module.exports = router;
