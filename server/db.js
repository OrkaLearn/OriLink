const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: 'localhost',
  port: 3306,
  user: 'kevin',
  password: '0IsIs//',
  database: 'orilink',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

async function initDatabase() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'kevin',
    password: '0IsIs//',
  });

  await connection.query('CREATE DATABASE IF NOT EXISTS orilink');
  await connection.query('USE orilink');

  await connection.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(255) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      full_name VARCHAR(100) NOT NULL DEFAULT '',
      grade VARCHAR(2) NOT NULL DEFAULT '',
      class VARCHAR(2) NOT NULL DEFAULT '',
      personality_type VARCHAR(4) DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const [cols] = await connection.query('DESCRIBE users');
  const colNames = cols.map(c => c.Field);

  if (!colNames.includes('full_name')) {
    await connection.query('ALTER TABLE users ADD COLUMN full_name VARCHAR(100) NOT NULL DEFAULT ""');
  }

  if (colNames.includes('email_verified')) {
    await connection.query('ALTER TABLE users DROP COLUMN email_verified');
  }

  if (!colNames.includes('email')) {
    await connection.query('ALTER TABLE users ADD COLUMN email VARCHAR(255) NOT NULL DEFAULT ""');
  }

  if (!colNames.includes('warning_count')) {
    await connection.query('ALTER TABLE users ADD COLUMN warning_count INT NOT NULL DEFAULT 0');
  }

  await connection.query(`
    CREATE TABLE IF NOT EXISTS warnings (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      invitation_id INT NOT NULL,
      invitation_title VARCHAR(255) NOT NULL,
      reason VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS invitations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      title VARCHAR(100) NOT NULL,
      description VARCHAR(300) NOT NULL,
      type ENUM('play/sports', 'teammate finding', 'tutoring', 'other') NOT NULL,
      max_participants INT NOT NULL DEFAULT 1,
      event_start DATETIME,
      event_end DATETIME,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  const [invCols] = await connection.query('DESCRIBE invitations');
  const invColNames = invCols.map(c => c.Field);

  if (!invColNames.includes('max_participants')) {
    await connection.query('ALTER TABLE invitations ADD COLUMN max_participants INT NOT NULL DEFAULT 1');
  }
  if (!invColNames.includes('event_start')) {
    await connection.query('ALTER TABLE invitations ADD COLUMN event_start DATETIME');
  }
  if (!invColNames.includes('event_end')) {
    await connection.query('ALTER TABLE invitations ADD COLUMN event_end DATETIME');
  }

  await connection.query(`
    CREATE TABLE IF NOT EXISTS joined_invitations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      invitation_id INT NOT NULL,
      joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (invitation_id) REFERENCES invitations(id) ON DELETE CASCADE,
      UNIQUE KEY unique_join (user_id, invitation_id)
    )
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS messages (
      id INT AUTO_INCREMENT PRIMARY KEY,
      invitation_id INT NOT NULL,
      user_id INT NOT NULL,
      content TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (invitation_id) REFERENCES invitations(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  console.log('Database, users table, and invitations table ready (with new columns)');
  await connection.end();
}

module.exports = { pool, initDatabase };
