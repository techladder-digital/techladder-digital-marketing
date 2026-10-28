# TechLadder Digital Marketing — Website & Admin Panel

A production-ready business website for **TechLadder Digital Marketing**, with a secure administration panel.

| Layer | Technology |
|---|---|
| Frontend | Angular 20 (standalone components, signals, lazy routes), Angular Material 20, Bootstrap 5.3 CSS, ngx-toastr, Reactive Forms |
| Backend | Node.js 20+/22, Express 5, TypeScript, mysql2/promise, Zod validation, bcrypt (bcryptjs), JWT access tokens, Nodemailer, Helmet, express-rate-limit |
| Database | MySQL 8+ (InnoDB, utf8mb4), versioned SQL migrations |
| Integrations | SMTP email (Nodemailer), WhatsApp Business Platform Cloud API, YouTube Data API v3, Meta Graph API (optional follower counts) |

Brand colours used throughout: **Black `#111111` · White `#FFFFFF` · Orange `#FF7900`**.

---

## 1. What's included

**Public website — exactly five main pages**

| Route | Page |
|---|---|
| `/` | Home: hero banner, introduction, both service previews, why-choose-us, featured portfolio, approved feedback, social profiles, call to action |
| `/services` | Two visually distinct paths — **A: Digital Marketing** (15 services) and **B: Website & Software** (10 services). *Learn More* opens a detail dialog; *Enquire Now* opens the contact page with category and service preselected |
| `/portfolio` | Category filters, responsive cards, detail dialog. Demo items are always labelled “Sample / concept work” |
| `/contact` | Email / WhatsApp / Call / Directions buttons (all admin-configurable) and the enquiry form |
| `/feedback` | Approved, consented reviews + a feedback form with accessible star rating |

Plus a left sidebar (collapsible; slide-out drawer on mobile), sticky top navigation, footer, floating WhatsApp button, custom 404 page, page titles/meta/Open Graph tags, `robots.txt` and `sitemap.xml`.

**Admin panel (`/admin`, protected)** — dashboard with live database counts, **media library with photo/video upload** (drag & drop, progress bar; uploaded videos play on the portfolio page), enquiries (search, filter, pagination, status, notification log + manual retry), feedback moderation, portfolio CRUD/publish/feature, service CRUD, social links and follower counts, website settings (contact details, logo, hero banner, footer), email/WhatsApp integration status, sign out.

**Honesty rules built in**

- No fake reviews, statistics, client logos, follower counts or delivery confirmations are seeded or generated.
- Enquiry success is shown **only after the API confirms the database save**.
- Notification statuses are precise: `skipped` (not configured), `accepted` (provider accepted the request — *not* proof of delivery), `sent/delivered/read` (only from the WhatsApp webhook), `failed` (with automatic retry and backoff).
- Follower counts are labelled “Updated manually · date” or “From <platform> API · date”. Admins cannot type a number and label it as API-verified.
- Feedback cannot be approved for publication unless the customer consented.

---

## 2. Architecture

```
 Browser (Angular SPA)                     Node.js API (Express + TS)                    MySQL 8
 ─────────────────────                     ───────────────────────────                   ───────
  Public pages  ──── GET /api/...  ───────▶ routes → controllers → services → repositories ─▶ techladder_db
  Enquiry form  ──── POST /api/enquiries ─▶  1. save enquiry + pending notification rows (transaction)
                                             2. Nodemailer ─▶ SMTP server ─▶ business inbox
                                             3. WhatsApp Cloud API (approved template) ─▶ business phone
  Admin panel   ──── Bearer token ────────▶ requireAuth (JWT + DB check) → requireRole
                                           ◀── Meta webhook (signed) updates WhatsApp delivery status
                                           Background: notification retry worker, follower-count sync
```

- **Controller → service → repository** pattern; every SQL statement uses `?` placeholders (prepared statements).
- Secrets live only in `backend/.env`. The Angular bundle contains only the API base URL.
- Admin auth: short-lived HS256 JWT (default 30 min) sent as `Authorization: Bearer`. Each request re-checks the admin in MySQL, so **logout, deactivation and password resets revoke tokens immediately** (`token_version`). Because tokens are not cookies, CSRF protection is not required.

## 3. Folder structure

```
techladder-digital-marketing/
├── README.md                      ← you are here
├── docs/
│   ├── API.md                     REST endpoint reference
│   ├── DEPLOYMENT.md              Production deployment (frontend, API, MySQL, HTTPS, SMTP, WhatsApp, backups, monitoring)
│   ├── WHATSAPP-SETUP.md          Enabling automatic WhatsApp notifications
│   ├── SECURITY-CHECKLIST.md
│   ├── SEO-AND-ACCESSIBILITY.md
│   ├── TROUBLESHOOTING.md
│   └── nginx.example.conf
├── backend/
│   ├── src/
│   │   ├── app.ts, server.ts
│   │   ├── config/        env.ts (validated config), database.ts (pool, transactions)
│   │   ├── routes/        public, auth, admin, webhook
│   │   ├── controllers/   public, auth, admin, webhook
│   │   ├── services/      auth, audit, email, whatsapp, notification, enquiry, social-sync
│   │   ├── repositories/  admin, audit, enquiry, notification, feedback, portfolio, service, social, settings
│   │   ├── validators/    Zod schemas (enquiry, feedback, portfolio, service, social, settings, auth)
│   │   ├── middleware/    auth, error, rate-limit
│   │   ├── utils/, types/
│   ├── migrations/        001_initial_schema.sql, 002_reference_data.sql, 003_media_uploads.sql
│   ├── uploads/           uploaded photos/videos (created automatically, back it up)
│   ├── scripts/           migrate.ts, create-admin.ts
│   ├── tests/             Jest + Supertest (unit, API, SQL-injection, integration)
│   ├── schema.sql         consolidated schema for a fresh install
│   └── .env.example
└── frontend/
    ├── src/app/
    │   ├── core/          models, services (api, auth, site-data, seo), guards, interceptors, utils
    │   ├── shared/components/  sidebar, top-nav, footer, service/portfolio/feedback cards, star-rating,
    │   │                       enquiry-form, whatsapp-button, loading/error/empty states, dialogs
    │   ├── layouts/       main-layout, admin-layout
    │   └── pages/         home, services, portfolio, contact, feedback, not-found, admin/*
    ├── src/assets/images/ hero-banner.svg, logo.svg, og-image.png (replaceable)
    ├── public/            favicon.svg, robots.txt, sitemap.xml
    ├── proxy.conf.json    dev proxy /api → http://localhost:3000
    └── .env.example       non-secret build settings
```

---

## 4. Local development on Windows

### 4.1 Prerequisites

| Tool | Version | Check |
|---|---|---|
| Node.js | **20.19+ or 22.12+** (LTS) — https://nodejs.org | `node -v` |
| npm | 10+ (bundled with Node) | `npm -v` |
| MySQL Server | **8.0+** — MySQL Installer for Windows | `mysql --version` |
| Angular CLI | optional global install; the project's local CLI works via `npx ng` | `npm i -g @angular/cli@20` |
| Git | any recent | `git --version` |

All dependency versions are pinned exactly in `package.json`, and `package-lock.json` locks the full tree. Use `npm ci` for reproducible installs.

### 4.2 Create the database and a dedicated MySQL user

Open **MySQL Command Line Client** (or `mysql -u root -p` in PowerShell) and run — choose your own strong password:

```sql
CREATE DATABASE techladder_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'techladder'@'localhost' IDENTIFIED BY 'choose-a-strong-password';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, REFERENCES ON techladder_db.* TO 'techladder'@'localhost';

-- Separate database for automated tests (never use production data for tests)
CREATE DATABASE techladder_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
GRANT ALL PRIVILEGES ON techladder_test.* TO 'techladder'@'localhost';
FLUSH PRIVILEGES;
```

### 4.3 Backend

```powershell
cd techladder-digital-marketing\backend
npm ci
Copy-Item .env.example .env
notepad .env          # set DB_USER, DB_PASSWORD, JWT_SECRET (see below); leave SMTP/WhatsApp blank for now
npm run migrate       # creates tables + service catalogue, default settings, empty social rows
npm run admin:create  # interactive: name, email, role, password (hidden) — there is NO default admin
npm run dev           # API on http://localhost:3000  (check http://localhost:3000/api/health)
```

Generate a JWT secret:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

> Alternative to migrations: run `backend\schema.sql` in MySQL Workbench for a fresh install. Running `npm run migrate` afterwards is safe (idempotent).

### 4.4 Frontend

In a second PowerShell window:

```powershell
cd techladder-digital-marketing\frontend
npm ci
npm start             # http://localhost:4200 (proxies /api to http://localhost:3000)
```

Sign in at **http://localhost:4200/admin/login** with the account you created, then open **Website settings** to enter your business email, WhatsApp number, phone, address, Google Maps link and business hours, and **Social media** to enable profiles.

### 4.5 Tests, lint and production build

```powershell
# Backend
cd backend
npm run lint
npm run typecheck
npm test                                   # unit + API + SQL-injection tests (no DB needed)
$env:TEST_DB_NAME="techladder_test"; $env:TEST_DB_USER="techladder"; $env:TEST_DB_PASSWORD="your-password"
npm run test:integration                   # real-MySQL tests; runs ONLY when the DB name ends with _test
npm run build                              # → dist/

# Frontend
cd ..\frontend
npm run lint
npm test                                   # Jest (jsdom): form validation, routing, API error handling
npm run build:prod                         # → dist/techladder/browser/
```

Verified results for this delivery: backend **153 tests passing** (including 6 integration tests against a real database), frontend **49 tests passing**, lint and production builds clean.

---

## 5. Optional integrations

| Feature | Needs | Without it |
|---|---|---|
| Email alerts | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `BUSINESS_EMAIL`, `EMAIL_FROM` | Enquiries are saved; notification marked “Not configured” |
| WhatsApp alerts | WhatsApp Business Platform app, approved template, token — see [docs/WHATSAPP-SETUP.md](docs/WHATSAPP-SETUP.md) | Enquiries are saved; visitors can still open a prefilled WhatsApp chat |
| Live YouTube subscriber count | `YOUTUBE_API_KEY` + channel ID in admin | Manual count with last-updated date |
| Live Facebook / Instagram followers | `META_GRAPH_ACCESS_TOKEN` + Page / IG user ID in admin | Manual count |
| Threads, LinkedIn, WhatsApp counts | No supported public follower-count API is integrated | Manual count |

Integrations are never reported as working until they succeed with real credentials — check **Admin → Dashboard → Integrations** and use **Test SMTP connection**.

## 6. Photos and videos

- **Admin → Media library**: drag & drop or click **Upload photos / videos**. JPG/PNG/WebP/GIF up to 5 MB, MP4/WebM up to 100 MB (change with `MAX_IMAGE_UPLOAD_MB` / `MAX_VIDEO_UPLOAD_MB`).
- Every image/video field in Portfolio, Services and Website settings has **Upload** and **Library** buttons, so you can upload directly from the form.
- Portfolio projects with a video show a play button; visitors watch it in the project dialog.
- Files are stored in `backend/uploads/` — **include this folder in your backups**.

## 7. Replacing brand assets

- **Logo**: replace `frontend/src/assets/images/logo.svg` (and `public/favicon.svg`), or set *Logo image* in Website settings to an `https://` URL or `/assets/...` path.
- **Hero banner**: replace `frontend/src/assets/images/hero-banner.svg`, or set *Hero banner image*, headline and subheading in Website settings.
- **Social share image**: replace `frontend/src/assets/images/og-image.png` (1200×630).
- Social platforms are shown as text badges (IG, FB, WA…). If you add official platform icons, follow each platform's brand guidelines.

## 8. Further reading

- [docs/API.md](docs/API.md) · [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) · [docs/WHATSAPP-SETUP.md](docs/WHATSAPP-SETUP.md)
- [docs/SECURITY-CHECKLIST.md](docs/SECURITY-CHECKLIST.md) · [docs/SEO-AND-ACCESSIBILITY.md](docs/SEO-AND-ACCESSIBILITY.md) · [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)
- [backend/README.md](backend/README.md) · [frontend/README.md](frontend/README.md)
