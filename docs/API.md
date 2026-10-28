# REST API reference

Base path: `/api`. All responses are JSON.

```jsonc
// success
{ "success": true, "data": { ... }, "meta": { "page": 1, "pageSize": 20, "total": 42, "totalPages": 3 } } // meta on paged lists
// error
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "Please correct the highlighted fields", "details": { "email": "Enter a valid email address" } } }
```

Common status codes: `200` OK · `201` created · `400` bad request / malformed JSON · `401` not signed in / expired · `403` role not allowed · `404` not found · `409` duplicate · `413` body > 20 KB · `422` validation failed · `423` account locked · `429` rate limited · `500` internal error (no stack traces) · `503` database unavailable (health).

## Public

| Method | Path | Notes |
|---|---|---|
| GET | `/health` | `{ status, database: "up" \| "down", time }` — no infrastructure details |
| GET | `/settings/public` | Allowlisted keys only: company_name, hero_headline, hero_subheading, hero_image_url, logo_url, company_intro, business_email, whatsapp_number, business_phone, business_address, google_maps_url, business_hours, footer_text, whatsapp_prefill_message |
| GET | `/services?category=digital_marketing\|website_software` | Active services only |
| GET | `/portfolio?category=&featured=true&limit=60` | **Published** projects only |
| GET | `/portfolio/:id` | 404 unless published |
| GET | `/social-links` | Enabled platforms with a URL; count only if “show count” is on |
| GET | `/feedback/public?limit=12` | **Approved + consented** feedback only |
| POST | `/enquiries` | Rate limit 5 / 10 min / IP. Body below. Returns `201 { enquiryId, notifications: { email, whatsapp } }` |
| POST | `/feedback` | Rate limit 5 / 10 min / IP. Saved as `pending` |
| GET/POST | `/webhooks/whatsapp` | Meta verification handshake / signed delivery-status webhook |

### POST /api/enquiries

```json
{
  "fullName": "Priya Kumar",              // 2–120, required
  "businessName": "Kumar Traders",        // optional, ≤160
  "email": "priya@example.com",           // required
  "phone": "+91 98765 43210",             // required, 7–15 digits
  "projectType": "website",               // digital_marketing | website | software
  "serviceName": "Business Website Development", // required, ≤160
  "budgetRange": "Not sure yet",          // optional; one of the listed ranges
  "message": "We need a new website…",    // 10–3000
  "preferredContactMethod": "both",       // email | whatsapp | both
  "consentToContact": true                // must be true
}
```

Notification status values: `pending`, `skipped` (integration not configured), `accepted` (provider accepted the request; not proof of delivery), `sent`/`delivered`/`read` (WhatsApp webhook), `failed`.

### POST /api/feedback

`{ customerName, businessName?, serviceCategory: digital_marketing|website_software, projectName, rating: 1–5, feedbackMessage: 10–2000, consentToPublish: boolean }`

## Authentication

| Method | Path | Notes |
|---|---|---|
| POST | `/auth/login` | `{ email, password }` → `{ token, expiresAt, admin }`. Rate limit 10 / 15 min per IP+email; account locks 15 min after 5 failures |
| POST | `/auth/logout` | Revokes **all** tokens of the admin |
| GET | `/auth/me` | Current admin |

Send `Authorization: Bearer <token>` on every admin request.

## Admin (all require authentication)

Roles: **admin** = everything; **editor** = website content only (no enquiries, settings, integrations or audit logs).

| Method | Path | Role |
|---|---|---|
| GET | `/admin/dashboard` | admin, editor |
| GET | `/admin/enquiries?page=&pageSize=&status=&projectType=&search=` | admin |
| GET | `/admin/enquiries/:id` | admin (includes notification log) |
| PATCH | `/admin/enquiries/:id/status` `{ status: new\|contacted\|in_progress\|closed\|spam }` | admin |
| POST | `/admin/notifications/:id/retry` | admin |
| GET | `/admin/feedback?status=&page=&pageSize=` | admin, editor |
| PATCH | `/admin/feedback/:id/moderation` `{ status: approved\|rejected\|pending }` | admin, editor |
| GET / POST | `/admin/portfolio` | admin, editor |
| PUT / DELETE | `/admin/portfolio/:id` | admin, editor |
| GET / POST | `/admin/services` | admin, editor |
| PUT / DELETE | `/admin/services/:id` | admin, editor |
| GET | `/admin/social-links` | admin, editor |
| PUT | `/admin/social-links/:id` | admin, editor |
| POST | `/admin/social-links/sync` | admin, editor |
| GET / PUT | `/admin/settings` (partial update, allowlisted keys only) | admin |
| POST | `/admin/uploads` — `multipart/form-data`, one file in field `file` | admin, editor |
| GET | `/admin/media?kind=image\|video&page=&pageSize=` | admin, editor |
| GET | `/admin/media/:id/usages` (where the file is used) | admin, editor |
| DELETE | `/admin/media/:id` (removes record and file) | admin, editor |
| GET | `/admin/integrations` (configured flags + last outcome, never secrets) | admin |
| POST | `/admin/integrations/email/verify` | admin |
| GET | `/admin/audit-logs` | admin |

Portfolio body: `{ title, category, description, thumbnailUrl?, videoUrl?, projectUrl?, isSample, isFeatured, isPublished }` — `thumbnailUrl` must be an uploaded image (`/uploads/…`), an `https://` image URL or an `/assets/…` path; `videoUrl` must be an uploaded MP4/WebM or an `https://…/file.mp4|webm` link; `projectUrl` must be http(s).

### Uploads

Accepted: JPEG, PNG, WebP, GIF (≤ `MAX_IMAGE_UPLOAD_MB`, default 5) and MP4, WebM (≤ `MAX_VIDEO_UPLOAD_MB`, default 100). The type is detected from the file's **content (magic bytes)**, not its name. SVG, HTML, PDF etc. are rejected with `422 UNSUPPORTED_FILE`; oversize files get `413`. Response: `201 { id, kind, originalName, url: "/uploads/YYYY/MM/<random>.ext", mimeType, sizeBytes, uploadedBy, createdAt }`. Files are served from `GET /uploads/...` with `X-Content-Type-Options: nosniff`, a sandbox CSP and HTTP range support (video seeking).

Service body: `{ category, title, slug?, description, details?, icon?, imageUrl?, isActive, displayOrder }`.

Social link body: `{ profileName, profileUrl (https), followerCount, countType: manual|api, apiAccountId, isEnabled, showFollowerCount }`. With `countType: "api"` the submitted `followerCount` is ignored — API figures are written only by the sync job.
