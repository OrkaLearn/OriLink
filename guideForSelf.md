# OriLink Server Guide

Quick commands to run the OriLink backend server.

---

## 1. Start the Server

Before starting, make sure MariaDB is running:

```bash
sudo systemctl start mariadb
```

Then, from the project root, start the server:

```bash
cd /home/orka/Documents/projects/orilink/server
npm start
```

The website will be available at: `http://localhost:3000`

---

## 2. Stop the Server

If the server is running on port 3000 and you need to kill it:

```bash
fuser -k 3000/tcp
```

Or press `Ctrl + C` in the terminal where it's running.

---

## 3. Development Mode (Auto-Restart)

Use this when coding so the server restarts automatically on file changes:

```bash
cd /home/orka/Documents/projects/orilink/server
npm run dev
```

- `npm run dev` — Auto-restart on changes (development)
- `npm start` — Start normally (production)

---

## 4. Access the Database (MySQL)

```bash
sudo mysql -u root -p
```

Password: `0IsIs//`

---

## 5. Manage Users

Run from the `server/` directory:

```bash
node manage-users.js <command> [arguments]
```

**Commands:**

| Command | Description | Example |
| --- | --- | --- |
| `list` | Show all users | `node manage-users.js list` |
| `add` | Create a new user | `node manage-users.js add johndoe password123` |
| `delete` | Delete a user | `node manage-users.js delete johndoe` |
| `reset-password` | Reset a password | `node manage-users.js reset-password johndoe newpass` |
| `show` | Show user details | `node manage-users.js show johndoe` |

---

## 6. Admin Panel (Hidden)

A hidden admin panel is built into the login page for managing users.

**Shortcut:** Press `Ctrl + Shift + A` on the login page (`http://localhost:3000/login.html`) to open it.

**Admin password:** `0IsIs//` (same as MySQL)

**Features:**
- View all registered users in a table
- Add new users manually (username, password, grade, class)
- Edit users (change grade, class, or reset password)
- Delete users

---

## 7. Transfer Database to Another Computer

Use MySQL dump to export and import the database.

### Export (on source computer)

```bash
mysqldump -u root -p orilink > orilink_backup.sql
```

Copy `orilink_backup.sql` to the new computer.

### Import (on new computer)

Create the database first:

```bash
sudo mysql -u root -p
```

```sql
CREATE DATABASE orilink;
EXIT;
```

Then restore the data:

```bash
mysql -u root -p orilink < orilink_backup.sql
```

> **Note:** After transferring, make sure the MySQL password in `server/db.js` matches the password on the new computer. If it's different, update the `password` field in `db.js` to the new one.
