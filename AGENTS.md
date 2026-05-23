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
# In situation where server is hosted on port 3000
fuser -k 3000/tcp


...[rest of file unchanged]...
