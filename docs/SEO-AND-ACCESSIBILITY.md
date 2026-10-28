# SEO and accessibility

## SEO features

- Route titles (`Page | TechLadder Digital Marketing`) via a custom `TitleStrategy`.
- Per-route meta description, `robots` (admin/404 are `noindex`), canonical link, Open Graph and Twitter tags (`SeoService`).
- Default Open Graph image `assets/images/og-image.png` (1200×630).
- Clean URLs (`/services`, `/portfolio`, `/contact`, `/feedback`), `robots.txt` (disallows `/admin`) and `sitemap.xml` in `frontend/public/` — **replace `yourdomain.com`** before deploying.
- Semantic landmarks (`header`, `nav`, `main`, `footer`, `section` with headings), one `h1` per page.
- Lazy-loaded routes and `loading="lazy"` images; self-hosted fonts and icons (no third-party font requests).
- Honest copy: no guaranteed rankings, sales or advertising results.

## Limitations of a client-rendered Angular app

Google renders JavaScript and can index this site, but:

- Some crawlers and link-preview bots (WhatsApp, LinkedIn, Facebook, X) do **not** run JavaScript. They see the default tags in `index.html`, so every page shares the same preview title/description/image.
- Rendering is deferred, so indexing of new content can be slower than for server-rendered HTML.
- Content that loads from the API (services, portfolio, feedback) is not in the initial HTML.

## Future path: server-side rendering / prerendering

Angular has built-in SSR and prerendering:

```powershell
cd frontend
npx ng add @angular/ssr
```

Then:

1. Prerender the five public routes at build time (`outputMode: "static"` or route-level `RenderMode.Prerender`) for the best performance, or use `RenderMode.Server` for always-fresh API content.
2. Guard browser-only APIs (`localStorage`, `sessionStorage`, `window`, `document.location`) with `isPlatformBrowser` / `afterNextRender` — this project already wraps storage access in `try/catch`, but `SeoService` and the layout use `document`/`location`.
3. Use an absolute `API_BASE_URL` (or `HttpClient` with an interceptor that resolves relative URLs) on the server.
4. Keep `/admin` client-rendered (`RenderMode.Client`).

## Accessibility (WCAG 2.1 AA intent)

- Colour contrast: orange surfaces use **black** text (white on #FF7900 fails AA); muted text uses ≥ 56% black on white.
- Visible orange focus ring on every interactive element; skip-to-content links in both layouts.
- Keyboard: sidebar/drawer (Material sidenav with focus trap and Esc), dialogs (focus trap), star rating (radio group with arrow keys, Home/End), chips, selects.
- Forms: visible labels, required markers explained, inline error text (not colour-only) plus toasts, server errors mapped to fields, focus moved to the first invalid field.
- Images have descriptive `alt`; decorative icons are `aria-hidden`; external links announce “opens in a new tab”.
- Live regions announce loading states and form success.
- `prefers-reduced-motion` disables animations.
- Template accessibility lint rules (`angular-eslint` accessibility config) pass.

Recommended before launch: test with a screen reader (NVDA on Windows), keyboard-only navigation, and an automated checker such as Lighthouse or axe DevTools.
