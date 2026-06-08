# OriLink Server Guide

Quick commands to run the OriLink backend server.

---

## 1. Local Development

Start the server from the `server/` directory:

```bash
cd /home/kevin/projects/orilink/server
node index.js
```

For auto-restart on file changes:

```bash
cd /home/kevin/projects/orilink/server
npx nodemon index.js
```

Stop the server (port 3210):

```bash
fuser -k 3210/tcp
```

Or press `Ctrl + C` in the terminal where it's running.

---

## 2. Production Server (esshasrv003)

OriLink runs as a systemd service named **`kevin-orilink.service`** (user `kevin`, port 3210).

### Manage Service

Sudoers: `/etc/sudoers.d/orilink-kevin`

```bash
sudo systemctl start kevin-orilink        # or kevin-orilink.service
sudo systemctl stop kevin-orilink
sudo systemctl restart kevin-orilink
sudo systemctl status kevin-orilink
```

### View logs

```bash
journalctl -u kevin-orilink -f
```

Service unit: `/etc/systemd/system/kevin-orilink.service`

### Reload Nginx

After editing nginx config (`/home/kevin/nginx/kevin.conf`):

```bash
sudo nginx -t && sudo systemctl reload nginx
```

Or use:

```bash
sudo nginx -s reload
```

Sudoers: `/etc/sudoers.d/nginx-kevin`

---

## 3. Manage Users

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

## 4. Admin Panel (Hidden)

A hidden admin panel is built into the login page for managing users.

**Shortcut:** Press `Ctrl + Shift + A` on the login page to open it.

**Admin password:** `0IsIs//`

**Features:**
- View all registered users in a table
- Add new users manually (username, password, grade, class)
- Edit users (change grade, class, or reset password)
- Delete users

---

## 5. Transfer Database to Another Computer

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