# Production deployment

Recommended topology (keeps everything same-origin, so the browser never needs CORS):

```
                 HTTPS (Let's Encrypt)
  Visitors ───▶  Nginx  ── /            → frontend/dist/techladder/browser (static files, SPA fallback)
                        ── /api/*       → Node.js API on 127.0.0.1:3000 (PM2 / systemd / Windows service)
                                              │
                                              └─▶ MySQL 8 (managed service or private server, NOT public)
```

Any equivalent works: e.g. frontend on Netlify/Vercel/Azure Static Web Apps/S3+CloudFront, API on Azure App Service/Render/Railway/EC2, MySQL on Azure Database for MySQL / Amazon RDS / DigitalOcean Managed MySQL.

## 1. MySQL

1. Use a **managed MySQL 8** service or a hardened server. **Never expose port 3306 to the internet** — allow only the API host (private network, firewall/security-group rule, or IP allowlist) and require TLS (`DB_SSL=true` when the provider requires it).
2. Create the database and a least-privilege user:
   ```sql
   CREATE DATABASE techladder_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   CREATE USER 'techladder_app'@'10.0.%' IDENTIFIED BY '<long random password>';
   GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, REFERENCES ON techladder_db.* TO 'techladder_app'@'10.0.%';
   ```
   (You may run migrations with a separate migration user and drop CREATE/ALTER from the runtime user afterwards.)
3. **Backups**: enable automated daily backups + point-in-time recovery on managed services. Self-hosted example (cron, keeps 14 days):
   ```bash
   mysqldump --single-transaction --routines --triggers -u backup -p techladder_db | gzip > /backups/techladder_$(date +%F).sql.gz
   find /backups -name 'techladder_*.sql.gz' -mtime +14 -delete
   ```
   Store copies off-server and **test a restore** at least quarterly.
4. **Uploaded photos/videos** live in the backend `uploads/` folder (`UPLOAD_DIR`), not in MySQL. Back this folder up together with the database, e.g. `tar czf /backups/techladder_uploads_$(date +%F).tgz -C /var/www/techladder-api uploads`. On hosts with an ephemeral filesystem (some PaaS), mount a persistent disk/volume at `UPLOAD_DIR`, otherwise uploads disappear on redeploy.

## 2. Backend API

```bash
cd backend
npm ci
npm run build                 # compiles to dist/
cp .env.example .env          # or set variables in your host's secret manager
npm run migrate:prod          # applies pending migrations (safe to re-run; never drops data)
npm run admin:create:prod     # first admin account (interactive; no default passwords)
NODE_ENV=production node dist/src/server.js
```

Production `.env` essentials:

```
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://www.yourdomain.com,https://yourdomain.com   # exact origins; no wildcards
TRUST_PROXY=1                                                    # behind one reverse proxy
DB_HOST=... DB_PORT=3306 DB_USER=techladder_app DB_PASSWORD=... DB_NAME=techladder_db DB_SSL=true
JWT_SECRET=<48+ random bytes>   JWT_EXPIRES_IN_MINUTES=30
SMTP_HOST=... SMTP_PORT=587 SMTP_SECURE=false SMTP_USER=... SMTP_PASSWORD=... EMAIL_FROM="TechLadder Website <no-reply@yourdomain.com>" BUSINESS_EMAIL=...
WHATSAPP_* (see WHATSAPP-SETUP.md)
```

The API refuses to start in production with a placeholder `JWT_SECRET` or empty `DB_PASSWORD`, and exits if MySQL is unreachable.

**Process manager** (Linux, PM2):

```bash
npm i -g pm2
pm2 start dist/src/server.js --name techladder-api --time
pm2 save && pm2 startup
```

On Windows Server, use a service wrapper such as NSSM or run under IIS with iisnode / a reverse proxy. The app handles `SIGINT`/`SIGTERM` gracefully (stops accepting requests, closes the MySQL pool).

Run **one** API instance, or if you scale out, note that the notification retry worker and social-sync timers run in every instance (they are safe but redundant); set `NOTIFICATION_RETRY_INTERVAL_SECONDS=0` and `SOCIAL_SYNC_INTERVAL_MINUTES=0` on all but one instance. Rate-limit counters are in memory per instance — for multiple instances use a shared store (e.g. a Redis store for express-rate-limit).

## 3. Frontend

```bash
cd frontend
npm ci
# Same-origin (recommended): API_BASE_URL=/api
# Separate API domain:       API_BASE_URL=https://api.yourdomain.com/api  (and add the site origin to backend FRONTEND_URL)
API_BASE_URL=/api SITE_URL=https://www.yourdomain.com npm run build:prod
```

Upload `dist/techladder/browser/` to your web server or static host. The reverse proxy must forward **both `/api/` and `/uploads/`** to the API, and allow large bodies for `/api/admin/uploads` (see `nginx.example.conf`). Configure **SPA fallback** (serve `index.html` for unknown paths) so deep links like `/services` work. Update the domain in `public/robots.txt` and `public/sitemap.xml` before building.

## 4. Domain and HTTPS

1. DNS: `A`/`AAAA` (or `CNAME`) records for `yourdomain.com` and `www` pointing to your server/host. If the API is on its own subdomain, add `api.yourdomain.com`.
2. HTTPS: managed hosts issue certificates automatically. With Nginx, use Certbot: `sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com`.
3. Redirect HTTP → HTTPS and pick one canonical host (see `nginx.example.conf`). The API sends HSTS in production.

## 5. SMTP email

Use your mail provider's SMTP (Google Workspace, Microsoft 365, Zoho Mail, Amazon SES, SendGrid, Mailgun…). Port 587 + `SMTP_SECURE=false` (STARTTLS, enforced in production) or 465 + `SMTP_SECURE=true`. For deliverability, publish **SPF, DKIM and DMARC** records for the sending domain and use an `EMAIL_FROM` address on that domain. Google/Microsoft accounts usually need an *app password* or SMTP AUTH enabled. Check with **Admin → Dashboard → Test SMTP connection**.

## 6. Logs, monitoring and errors

- The API writes one JSON line per event to stdout/stderr (no secrets, no request bodies). Collect with PM2 (`pm2 logs`, `pm2 install pm2-logrotate`), systemd-journald, or your host's log service.
- Monitor `GET /api/health` with an uptime checker (UptimeRobot, Better Stack, Azure Monitor…). It returns `503` when the database is down.
- Watch for `"level":"error"` lines and the dashboard's **failed notifications** count.
- Production errors return a generic message to clients; details stay in server logs.

## 7. Database migrations on upgrade

1. Back up the database.
2. Deploy new code, `npm ci && npm run build`.
3. `npm run migrate:prod` — applies only new `migrations/NNN_*.sql` files, recorded in `schema_migrations`.
4. Restart the API.

Never edit an applied migration; add a new numbered file instead (the runner warns if a checksum changed).

## 8. Go-live checklist

- [ ] HTTPS working, HTTP redirects to HTTPS
- [ ] `FRONTEND_URL` lists only your real origins
- [ ] MySQL not reachable from the internet; backups enabled and a restore tested
- [ ] Strong unique `JWT_SECRET`, DB and SMTP passwords; `.env` not in source control
- [ ] Admin accounts created with strong passwords; test accounts removed
- [ ] Website settings and social links filled in; sample/demo content reviewed
- [ ] Test enquiry received by email (and WhatsApp if configured)
- [ ] Test photo + video upload from Admin → Media library; `uploads/` folder included in backups
- [ ] `robots.txt` / `sitemap.xml` domain updated; site submitted to Google Search Console
- [ ] Privacy policy published describing how enquiry data is used (consult a legal advisor for your jurisdiction)
