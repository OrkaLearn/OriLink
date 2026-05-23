const bcrypt = require('bcryptjs');
const { pool } = require('./db');

async function listUsers() {
  const [users] = await pool.query('SELECT id, username, full_name, personality_type, created_at FROM users ORDER BY id');
  console.log('\nUsers:');
  console.log('ID | Username | Full Name         | MBTI   | Created At');
  console.log('---|----------|-------------------|--------|-------------------');
  users.forEach(u => console.log(`${u.id} | ${u.username} | ${(u.full_name || '-').padEnd(17)} | ${u.personality_type || '-'}    | ${u.created_at}`));
  console.log(`\nTotal: ${users.length} user(s)\n`);
}

async function addUser(username, password) {
  const hashedPassword = await bcrypt.hash(password, 10);
  try {
    await pool.query('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashedPassword]);
    console.log(`User '${username}' created successfully.`);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      console.error(`Error: User '${username}' already exists.`);
    } else {
      throw err;
    }
  }
}

async function deleteUser(username) {
  const [result] = await pool.query('DELETE FROM users WHERE username = ?', [username]);
  if (result.affectedRows > 0) {
    console.log(`User '${username}' deleted successfully.`);
  } else {
    console.error(`Error: User '${username}' not found.`);
  }
}

async function resetPassword(username, newPassword) {
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  const [result] = await pool.query('UPDATE users SET password = ? WHERE username = ?', [hashedPassword, username]);
  if (result.affectedRows > 0) {
    console.log(`Password for '${username}' updated successfully.`);
  } else {
    console.error(`Error: User '${username}' not found.`);
  }
}

const cmd = process.argv[2];
const arg1 = process.argv[3];
const arg2 = process.argv[4];

(async () => {
  try {
    switch (cmd) {
      case 'list':
        await listUsers();
        break;
      case 'add':
        if (!arg1 || !arg2) {
          console.error('Usage: node manage-users.js add <username> <password>');
          process.exit(1);
        }
        await addUser(arg1, arg2);
        break;
      case 'delete':
        if (!arg1) {
          console.error('Usage: node manage-users.js delete <username>');
          process.exit(1);
        }
        await deleteUser(arg1);
        break;
      case 'reset-password':
        if (!arg1 || !arg2) {
          console.error('Usage: node manage-users.js reset-password <username> <new-password>');
          process.exit(1);
        }
        await resetPassword(arg1, arg2);
        break;
      default:
        console.log(`
User Management Script

Usage:
  node manage-users.js list                          List all users
  node manage-users.js add <username> <password>   Create new user
  node manage-users.js delete <username>            Delete a user
  node manage-users.js reset-password <username> <new-password>  Reset password
        `);
    }
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();