# TechLadder API (backend)

Node.js + Express 5 + TypeScript REST API backed by MySQL 8.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start with auto-reload (tsx) on `PORT` (default 3000) |
| `npm run build` / `npm start` | Compile to `dist/` / run compiled server |
| `npm run migrate` / `npm run migrate:prod` | Apply pending SQL migrations (dev via tsx / compiled) |
| `npm run admin:create` | Create an admin (`-- --reset` to reset a password). Non-interactive: `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_ROLE` env vars for one run |
| `npm test` | Jest + Supertest suites (no database required) |
| `npm run test:integration` | Real-MySQL tests — only when `TEST_DB_NAME` ends in `_test` |
| `npm run lint` / `npm run typecheck` | ESLint / TypeScript checks |

## Configuration

All configuration is validated at startup (`src/config/env.ts`). See `.env.example` for every variable. Optional integrations (SMTP, WhatsApp, YouTube, Meta) are disabled automatically when their variables are empty or still placeholders.

## Code layout

- `src/routes` → `src/controllers` → `src/services` → `src/repositories` → MySQL (`src/config/database.ts`)
- `src/validators` — Zod schemas; `parse()` turns failures into `422` with field messages
- `src/middleware` — `requireAuth`, `requireRole`, rate limiters, error handler
- `src/services/notification.service.ts` — dispatch, honest status recording, retry with backoff
- `migrations/` — numbered SQL files; `schema.sql` — consolidated fresh-install script

## Tests included

| File | Covers |
|---|---|
| `env.test.ts` | Environment validation, placeholder handling, CORS parsing |
| `database.test.ts` | Pool configuration, prepared statements, transactions/rollback, health |
| `enquiry-validation.test.ts` | Enquiry validation rules, size limits, honeypot, unknown fields |
| `enquiry-api.test.ts` | Persistence before notification, failure handling, 413/400/422 |
| `sql-injection.test.ts` | Injection payloads only ever sent as bound parameters |
| `notifications.test.ts` | Email + WhatsApp success/failure/retry/permanent errors, HTML escaping, token redaction |
| `whatsapp-webhook.test.ts` | Verification handshake, signature checks, status updates |
| `admin-auth.test.ts` | Login, lockout, token expiry/tampering/revocation, 401 on every admin route, editor 403 |
| `content.test.ts` | Feedback moderation, public portfolio filtering, social link rules, settings allowlist |
| `rate-limit.test.ts` | Submission rate limiting |
| `integration.test.ts` | Real MySQL: persistence, injection payload stored literally, CHECK constraint, public filtering |
