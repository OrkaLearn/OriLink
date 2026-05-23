const bcrypt = require('bcryptjs');
const { pool } = require('./db');

async function seed() {
  try {
    const hashedPassword = await bcrypt.hash('password2', 10);

    await pool.query(
      'INSERT INTO users (username, password) VALUES (?, ?) ON DUPLICATE KEY UPDATE password = ?',
      ['test', hashedPassword, hashedPassword]
    );

    console.log('Test user created: username=test, password=password2');
    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
}

seed();