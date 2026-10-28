# Security checklist

## Implemented in the code

| Area | Implementation |
|---|---|
| Security headers | Helmet on the API (strict CSP `default-src 'none'`, `frame-ancestors 'none'`, HSTS in production, no `X-Powered-By`). Website headers/CSP in `nginx.example.conf` |
| CORS | Explicit allowlist from `FRONTEND_URL`; credentials disabled; limited methods/headers |
| Rate limiting | 600 req / 15 min / IP for the API; 5 submissions / 10 min / IP for enquiries and feedback; 10 login attempts / 15 min per IP + email |
| Brute-force protection | Account lock for 15 min after 5 failed logins; identical error for unknown email and wrong password; constant-time dummy hash comparison |
| Input validation | Zod schemas on every endpoint, `.strict()` (unknown fields rejected), length limits, control-character filtering, enum checks, URL scheme checks (`https:` images/profile links; `javascript:`/`data:` rejected), honeypot field |
| Request size | JSON body limit 20 KB → 413 |
| SQL injection | `mysql2` prepared statements (`execute` with `?`) everywhere; LIKE wildcards escaped; `multipleStatements: false` on the runtime pool; tests assert user input never appears in SQL text |
| XSS | Angular auto-escaping (no `innerHTML` with user data); HTML emails escape all customer values; email subject strips CR/LF (header injection) |
| Passwords | bcrypt (cost 12); policy ≥12 chars with upper/lower/digit; no default admin — created via `npm run admin:create` |
| Sessions | HS256 JWT, 30-min default expiry, issuer/audience checked; DB re-check on every request; logout/password reset/deactivation revoke tokens via `token_version`. Token stored in `sessionStorage` and attached only to this API's `/admin` and `/auth` requests |
| CSRF | Not applicable: authentication uses the `Authorization` header, not cookies |
| Authorization | Server-side `requireAuth` on every `/api/admin/*` route; role checks (`admin` vs `editor`); Angular guards are convenience only |
| Open redirects | Login `returnUrl` limited to `/admin…` paths |
| Secrets | Only in backend environment variables; `.env` git-ignored; startup validation rejects placeholder secrets in production; Angular build contains only the API URL |
| Settings API | Public endpoint returns an explicit key allowlist; admin endpoint accepts only allowlisted keys (secrets can never be stored there) |
| Webhooks | WhatsApp webhook verified with `X-Hub-Signature-256` HMAC (timing-safe compare) and verify token |
| Error handling | Generic messages to clients; stack traces only in non-production logs; provider errors redacted (tokens/passwords stripped) |
| File uploads | Admin-only; one file per request streamed to disk; size limits per type; type decided from magic bytes (JPEG/PNG/WebP/GIF/MP4/WebM only — SVG/HTML rejected); random stored names; strict path pattern when serving; `nosniff` + `sandbox` CSP on served files; temp files removed on rejection |
| Audit logs | Logins, failed logins, logouts, enquiry views/status changes, notification retries, content and settings changes — IDs and action names only, never content or secrets |
| Data minimisation | Customer message text is not sent via WhatsApp; public feedback API returns only publishable fields; feedback is published only with consent and approval |
| Startup safety | Migrations never drop tables; app never alters schema at startup; graceful shutdown closes the DB pool |

## Your responsibilities before and after go-live

- [ ] Serve everything over HTTPS; redirect HTTP.
- [ ] Generate a unique random `JWT_SECRET` (≥32 chars; 48 random bytes recommended). Rotating it signs everyone out.
- [ ] Use a least-privilege MySQL user; keep MySQL off the public internet; enable TLS to the database if offered.
- [ ] Keep `.env` out of source control and backups that leave your control; prefer your host's secret manager.
- [ ] Create admin accounts individually (no shared logins); use `editor` role for content-only staff; remove leavers (`UPDATE admins SET is_active = 0 …`).
- [ ] Set `TRUST_PROXY` correctly (`1` behind a single proxy) so rate limiting sees real client IPs — never set it higher than the number of proxies.
- [ ] Apply the website CSP/security headers (see `nginx.example.conf`).
- [ ] Run `npm audit` regularly and update dependencies (test before deploying). At the time of delivery, `npm audit` reports issues only in test-only tooling (Jest coverage dependencies), not in runtime packages.
- [ ] Back up the database daily; test restores.
- [ ] Publish a privacy policy and define how long enquiries are kept; delete old enquiries per that policy.
- [ ] Monitor logs for repeated failed logins and 429 responses.
- [ ] Rotate SMTP passwords and WhatsApp/Meta tokens if they may have been exposed.
