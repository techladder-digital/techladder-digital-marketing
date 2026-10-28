# TechLadder website (frontend)

Angular 20 standalone application with Angular Material, Bootstrap CSS (reboot/grid/utilities only — no Bootstrap JS or jQuery) and ngx-toastr.

## Scripts

| Command | Purpose |
|---|---|
| `npm start` | Dev server on http://localhost:4200, proxying `/api` to http://localhost:3000 (`proxy.conf.json`) |
| `npm run build:prod` | Writes `src/environments/environment.prod.ts` from `API_BASE_URL` / `SITE_URL` (env or `.env`), then builds to `dist/techladder/browser` |
| `npm run build` | Production build using the existing environment file |
| `npm test` | Jest (jest-preset-angular, jsdom) |
| `npm run lint` | angular-eslint incl. template accessibility rules |

## Structure

- `core/` — typed models, `ApiService` (single HTTP layer, unwraps `{ success, data }`), `AuthService` (session in `sessionStorage`), `SiteDataService` (public settings + social links as signals), `SeoService`, title strategy, guards, interceptors (`authInterceptor` adds the token only to this API's admin/auth calls; `errorInterceptor` normalises errors and handles expired sessions).
- `shared/components/` — sidebar, top-nav, footer, brand logo, social links, service/portfolio/feedback cards, star rating (form control), enquiry form, WhatsApp button, loading/error/empty states, confirm and detail dialogs.
- `layouts/` — public shell (collapsible sidebar → drawer on mobile) and admin shell.
- `pages/` — five public pages, not-found, and `admin/*`.

## Tests included

- `enquiry-form.spec.ts` — form validation, preselection, duplicate-submit prevention, success only after API confirmation, server error mapping.
- `app.routes.spec.ts` — the five public routes, redirect, 404, admin guard and role guard.
- `error-handling.spec.ts` — envelope unwrapping, error normalisation, 401 handling, token scoping.
- `labels.spec.ts` — WhatsApp/tel/mailto link builders and service → project-type mapping.

## Configuration

Nothing secret belongs in the frontend. The only settings are the API base URL and the public site URL (see `.env.example`). Business contact details, hero banner, logo and social links are loaded at runtime from the API and edited in the admin panel.
