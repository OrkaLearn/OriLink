# OriLink Server Guide

Quick commands to run the OriLink backend server.

---

## 1. Local Development (WSL)

### Prerequisites (First-time setup)

#### Install npm (if not present)

WSL may only have Node.js installed without npm. Install it via dnf:

```bash
sudo dnf install -y nodejs-npm
```

#### Start MySQL

```bash
sudo systemctl start mysqld
```

#### Create MySQL user and database

```bash
sudo mysql -u root -p
```

```sql
CREATE USER IF NOT EXISTS 'kevin'@'localhost' IDENTIFIED BY 'your-password-here';
CREATE DATABASE IF NOT EXISTS orilink;
GRANT ALL PRIVILEGES ON orilink.* TO 'kevin'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

#### Set up environment variables

```bash
cd /home/orka/projects/orilink/server
cp .env.example .env
```

Edit `.env` with your values:
- `JWT_SECRET` - random string for JWT signing
- `DB_PASSWORD` - MySQL password for user 'kevin'
- `ADMIN_PASSWORD` - admin panel password
- `ADMIN_TOKEN` - admin API token

### Build CSS (required before first run)

The project uses **Tailwind CSS CLI** (not CDN). CSS must be compiled before the server can serve styled pages:

```bash
cd /home/orka/projects/orilink/server
npm run build:css
```

This compiles Tailwind utilities + custom styles from `public/src/input.css` into `public/style.css`.

### Start the server

**Option A: Using npm (auto-builds CSS)**
```bash
cd /home/orka/projects/orilink/server
npm start
```

**Option B: Using nodemon for auto-restart (auto-builds CSS)**
```bash
cd /home/orka/projects/orilink/server
npm run dev
```

**Option C: Direct node (manual CSS build required)**
```bash
cd /home/orka/projects/orilink/server
npm run build:css  # Must run this first
node index.js
```

> **Note:** `npm start` and `npm run dev` automatically run `npm run build:css` via `prestart`/`predev` hooks. Direct `node index.js` does NOT auto-build CSS.

### Access the server

From Windows browser: `http://localhost:3210`

### Stop the server (port 3210)

```bash
fuser -k 3210/tcp
```

Or press `Ctrl + C` in the terminal where it's running.

---

## 2. Production Server (esshasrv003)

OriLink runs as a systemd service named **`kevin-orilink.service`** (user `kevin`, port 3210).

### Deploy Changes

Compiled CSS (`public/style.css`) is committed to the repository. **No build step is needed on the server.**

```bash
cd /home/kevin/projects/orilink
git pull
sudo systemctl restart kevin-orilink
```

> **Important:** Always build and commit `public/style.css` locally before deploying. See Section 6 for the local build process.

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

---

## 6. Frontend Build (Tailwind CSS)

The frontend uses **Tailwind CSS v3** compiled via CLI (no CDN).

### Build Flow: Local Build → Commit → Deploy

**Tailwind is only installed on your development machine.** The production server does NOT need Tailwind installed.

```
Local Machine                    Git Repository              Production Server
┌─────────────────────┐         ┌──────────────────┐        ┌──────────────────┐
│ Edit .html/.js/.css │ ──────> │ Commit style.css │ ─────> │ git pull         │
│ npm run build:css   │         │ (compiled CSS)   │        │ restart service  │
└─────────────────────┘         └──────────────────┘        └──────────────────┘
```

### Local Build Steps

```bash
# 1. Make changes to HTML, JS, or public/src/input.css
# 2. Build CSS
cd server
npm run build:css

# 3. Commit the compiled CSS (and your source changes)
git add ../public/style.css
git add <your other changed files>
git commit -m "your message"
git push

# 4. On production server, just pull and restart
cd /home/kevin/projects/orilink
git pull
sudo systemctl restart kevin-orilink
```

### Project Structure

```
server/
  tailwind.config.js    # Tailwind configuration (dev only)
  package.json          # Contains build scripts (tailwindcss is devDependency)
public/
  src/
    input.css           # Tailwind directives + custom styles (EDIT THIS)
  style.css             # Compiled output (COMMIT THIS, DO NOT EDIT)
  login.html            # Homepage/login (no CDN)
  dashboard.html        # Dashboard (no CDN)
```

### Build Commands (run locally only)

```bash
# Build CSS only
cd server
npm run build:css

# Build entire project (CSS only, frontend is static)
npm run build
```

### When to Rebuild CSS

Rebuild CSS locally whenever you:
- Add/remove Tailwind utility classes in HTML or JS files
- Modify custom styles in `public/src/input.css`

Then commit the updated `public/style.css` before deploying.

### Git Configuration

Ensure `public/style.css` is tracked by git (not ignored):

```bash
# Verify style.css is tracked
git ls-files public/style.css

# If it's not tracked, add it
git add public/style.css
git commit -m "chore: add compiled tailwind css"
```

> **Important:** Never edit `public/style.css` directly. It is overwritten by the build process. Edit `public/src/input.css` instead.