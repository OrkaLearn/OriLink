# AGENTS.md

This file provides comprehensive guidelines for agentic coding agents operating in this secure social networking repository. It emphasizes security, code quality, and maintainability.

## Altcha-CAPTCHA Integration Policy (Login & Security)

**All login and authentication features MUST integrate and require successful Altcha (CAPTCHA) verification from users.**

- The `/login` backend route is required to enforce `altcha` verification by validating the Altcha widget payload using the server HMAC key and the `altcha-lib`'s `verifySolution` function.
- The login UI (HTML/JS) must display the `<altcha-widget>` component and require the Altcha solution before login.
- Any future modifications to login/auth routes MUST NOT bypass Altcha/CAPTCHA; attempts must be rejected server-side.
- Frontend and backend testing must include Altcha challenge, verification, and error UX for failed and missing CAPTCHA attempts.
- Any agent proposing to modify authentication must reference this policy and demonstrate continued Altcha enforcement (both in UI and server functions).

## 1. Build / Lint / Test Commands

Agents must prioritize security and stability in all operations.

### Build
```bash
# Build the entire project (backend and frontend)
npm run build
```

### Lint & Format
```bash
# Run ESLint for both backend and frontend, including security rules
npm run lint

# Automatically fix linting and formatting issues
npm run lint:fix

# Format code using Prettier
npm run format
```

### Test
```bash
# Run all unit and integration tests (backend and frontend)
npm test

# Run a single test file (e.g., for a specific backend service or React component)
# Example: Backend test
npm test -- server/src/auth/auth.test.ts
# Example: Frontend test
npm test -- client/src/components/UserProfile.test.tsx

# Run tests matching a specific name pattern (useful for a single test case)
npm test -- -t "should correctly validate user input"

# Run tests in watch mode for active development
npm test -- --watch

# Run API security penetration tests (if applicable, e.g., using OWASP ZAP or similar)
# TODO: Define specific commands for security penetration tests as part of CI/CD or local checks.
# npm run security:scan:api

# Run vulnerability scanning on dependencies
npm audit
```
### Kill Server
```bash
# OriLink backend listens on port 3210 (see server/index.js)
fuser -k 3210/tcp
```

## 2. Deployment & Nginx

OriLink runs on **esshasrv003** under the `kevin` user. Nginx reverse-proxies public traffic to the Node.js backend.

### Runtime

| Item | Value |
|------|-------|
| App directory | `/home/kevin/projects/orilink` |
| Backend port | `3210` (`server/index.js`) |
| Public domain | `ori.nekko.cn` |
| Nginx listen | `80`, `1234` |

### Nginx config (kevin-managed)

Config lives in the user home directory and is symlinked into nginx, same pattern as simon:

```
/home/kevin/nginx/kevin.conf
  ↑ symlink
/etc/nginx/sites-available/orilink
  ↑ symlink
/etc/nginx/sites-enabled/orilink
```

After editing `/home/kevin/nginx/kevin.conf`, reload nginx:

```bash
sudo nginx -t && sudo systemctl reload nginx
```

The `kevin` user has passwordless sudo for only these two commands (see `/etc/sudoers.d/nginx-kevin`).

The config proxies all paths (including `/api` and `/socket.io` WebSocket upgrades) to `http://127.0.0.1:3210/`.

### Systemd service

OriLink runs as **`kevin-orilink.service`** (user `kevin`, port `3210`).

```bash
# Preferred: use the web CLI (root shell)
web start kevin-orilink
web restart orilink
web status kevin-orilink
web logs orilink

# Or systemctl directly
sudo systemctl start kevin-orilink
sudo systemctl restart kevin-orilink
sudo systemctl status kevin-orilink
journalctl -u kevin-orilink -f
```

Service unit: `/etc/systemd/system/kevin-orilink.service`

After editing nginx config, reload with:

```bash
sudo nginx -t && sudo systemctl reload nginx
```

### Manual start (development)

```bash
cd /home/kevin/projects/orilink/server
node index.js
# or with nodemon for development
npx nodemon index.js
```

### Verify

```bash
curl --noproxy '*' -H 'Host: ori.nekko.cn' http://127.0.0.1:80/
curl --noproxy '*' -H 'Host: ori.nekko.cn' http://127.0.0.1:1234/
```

Use `--noproxy '*'` on this host if `http_proxy` is set (e.g. Clash on `127.0.0.1:7890`), otherwise curl may not hit local nginx.
