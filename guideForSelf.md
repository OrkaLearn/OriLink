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

### Preferred (web CLI)

```bash
web start kevin-orilink
web restart orilink
web status kevin-orilink
web logs orilink
```

### Alternative (systemctl)

```bash
sudo systemctl start kevin-orilink
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

## 6. Email Verification (Resend)

OriLink uses [Resend](https://resend.com/) to send email verification codes. The API key is stored in `server/.env` (locally) or as a systemd environment variable (production).

### Local Development

The `.env` file in `server/` contains:
```
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxx
```

This file is gitignored. Just make sure `resend` and `dotenv` packages are installed:
```bash
cd server
npm install
```

### Production Deployment (esshasrv003)

**Do NOT commit the `.env` file.** Instead, set the API key as a systemd environment variable:

```bash
sudo systemctl edit kevin-orilink.service
```

Add:
```ini
[Service]
Environment="RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxx"
```

Then reload and restart:
```bash
sudo systemctl daemon-reload
sudo systemctl restart kevin-orilink
```

### Test Domain vs Production Domain

**Current setup (test mode):**
- `from: 'OriLink 元联 <onboarding@resend.dev>'`
- `onboarding@resend.dev` is Resend's **sandbox/test domain**
- Emails can **ONLY** be sent to addresses you've verified in your Resend dashboard (Settings → Verified Addresses)
- This works for development and testing

**For production (sending to all users):**

1. Go to [Resend Dashboard](https://resend.com/domains) → **Add Domain**
2. Add your domain (e.g., `ori.nekko.cn`)
3. Add the required DNS records to your domain provider:
   - **SPF** (TXT record)
   - **DKIM** (CNAME records, usually 3)
4. Wait for DNS propagation (can take minutes to hours)
5. Once the domain shows as "Verified" in Resend, update the `from` address in `server/routes/email.js`:
   ```javascript
   from: 'OriLink 元联 <noreply@ori.nekko.cn>',
   ```
6. Restart the server:
   ```bash
   sudo systemctl restart kevin-orilink
   ```

### Troubleshooting

| Issue | Solution |
| --- | --- |
| "Email service not configured" | `RESEND_API_KEY` is not set or empty |
| Email not received | Check Resend dashboard → Emails → Activity log for delivery status |
| "Unverified domain" error | Domain DNS records not yet propagated; wait or verify records |
| Only works for your own email | Still using `onboarding@resend.dev`; verify your domain per steps above |