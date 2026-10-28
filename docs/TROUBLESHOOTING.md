# Troubleshooting

## Backend won't start

| Message | Cause / fix |
|---|---|
| `Invalid environment configuration: - DB_HOST: …` | `.env` missing or a required variable empty. Copy `.env.example` to `.env` in the `backend` folder and fill it in |
| `JWT_SECRET must be at least 32 characters` | Generate one: `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"` |
| `placeholder value is not allowed in production` | Replace `replace_me…` values when `NODE_ENV=production` |
| `Cannot connect to MySQL` | MySQL service not running (Windows: *Services → MySQL80 → Start*), wrong host/port/user/password, or firewall. Test with `mysql -h DB_HOST -u DB_USER -p` |
| `ER_ACCESS_DENIED_ERROR` | Wrong credentials or the user lacks privileges on `techladder_db` (see README §4.2) |
| `ER_BAD_DB_ERROR` | Database not created — run the `CREATE DATABASE` statement |
| `ER_NO_SUCH_TABLE` | Run `npm run migrate` |
| `EADDRINUSE :3000` | Another process uses the port. PowerShell: `Get-NetTCPConnection -LocalPort 3000 \| Select OwningProcess` then stop it, or change `PORT` |
| `ER_NOT_SUPPORTED_AUTH_MODE` | Very old MySQL client settings; use MySQL 8 with `caching_sha2_password` (default) and current `mysql2` |

## Frontend

| Symptom | Fix |
|---|---|
| Pages load but lists are empty / “couldn't load” | API not running, or the dev server proxy can't reach it. Start the backend first; check http://localhost:3000/api/health |
| CORS error in browser console (production) | Add the exact site origin (scheme + host, no trailing slash) to backend `FRONTEND_URL`, restart the API — or deploy same-origin behind a reverse proxy |
| 404 on refresh at `/services` (production) | Configure SPA fallback to `index.html` (see `nginx.example.conf`) |
| `npm ci` fails | Use Node 20.19+ / 22.12+; delete `node_modules` and retry; behind a corporate proxy set `npm config set proxy …` |
| `ng` not recognised | Use `npx ng …` or `npm run …` scripts, or install `npm i -g @angular/cli@20` |
| PowerShell: “running scripts is disabled” | `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` |

## Admin

| Symptom | Fix |
|---|---|
| “Invalid email or password” | Check the account; reset with `npm run admin:create -- --reset` |
| “Account temporarily locked” | Wait 15 minutes, or reset the password (also unlocks) |
| Signed out unexpectedly | Tokens expire after `JWT_EXPIRES_IN_MINUTES` (default 30) or after logout from another tab |
| Editor can't see Enquiries/Settings | By design — only the `admin` role can. Create an admin account or update the role in MySQL |
| “Cannot be published without customer consent” | The customer didn't tick the publish permission — the review stays private |

## Uploads

| Symptom | Fix |
|---|---|
| "Unsupported file type" | Only JPG, PNG, WebP, GIF images and MP4, WebM videos are accepted. iPhone HEIC photos / MOV videos must be converted first (or set the iPhone camera to "Most Compatible") |
| "The file is too large" | Images ≤ 5 MB, videos ≤ 100 MB by default. Compress the video (e.g. HandBrake, 720p) or raise `MAX_VIDEO_UPLOAD_MB` in `backend/.env` |
| Upload works locally but fails in production with 413 | Raise `client_max_body_size` for `/api/admin/uploads` in Nginx (see `nginx.example.conf`) or your host's request size limit |
| Uploaded images don't show in production | The proxy must forward `/uploads/` to the API. If the API is on its own domain, build the frontend with `API_BASE_URL=https://api.yourdomain.com/api` |
| Uploads vanished after redeploy | `UPLOAD_DIR` was on a temporary disk. Use a persistent volume and back it up |

## Notifications

| Status | Meaning / fix |
|---|---|
| Not configured | Email: set `SMTP_HOST` and `BUSINESS_EMAIL` (+ credentials). WhatsApp: see `WHATSAPP-SETUP.md`. Restart the API after editing `.env` |
| Failed – `EAUTH` / `535` | Wrong SMTP username/password; Gmail/Microsoft may require an app password or SMTP AUTH enabled |
| Failed – `ETIMEDOUT` / `ECONNREFUSED` | Wrong host/port, or outbound SMTP blocked by your host (many cloud hosts block port 25; use 587/465) |
| Accepted but no email arrives | Check spam; configure SPF/DKIM/DMARC; confirm `BUSINESS_EMAIL` |
| WhatsApp failed – code 132001 / 132000 | Template name/language mismatch, not approved, or wrong number of variables (must be 5) |
| WhatsApp stays “Accepted”, never “Delivered” | Webhook not configured or signature mismatch (`WHATSAPP_APP_SECRET`). The URL must be public HTTPS |

Failed notifications with temporary errors retry automatically (1, 2, 4, 8… min, up to 60 min, `NOTIFICATION_MAX_ATTEMPTS` times). Use **Retry now** on the enquiry page after fixing configuration.

## Follower counts

- **Sync error “not configured”**: set `YOUTUBE_API_KEY` or `META_GRAPH_ACCESS_TOKEN`, restart, then *Refresh API counts now*.
- **YouTube “Subscriber count is hidden”**: the channel hides it — use a manual count.
- **Meta “followers_count not returned”**: the token lacks Page / Instagram permissions or the Instagram account is not a professional account linked to a Page.
- When an API sync fails the last successful figure and its date stay visible; nothing is invented.

## Tests

- Integration tests are **skipped** unless `TEST_DB_NAME` ends with `_test` — this protects real data. They drop and recreate tables in that test database only.
- `npm test` in `frontend` uses Jest + jsdom; no browser is needed.
