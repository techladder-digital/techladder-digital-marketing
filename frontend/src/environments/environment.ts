// Development configuration. The dev server proxies /api to http://localhost:3000 (proxy.conf.json).
// Contains NO secrets — everything in this file is shipped to the browser.
export const environment = {
  production: false,
  apiBaseUrl: '/api',
  siteUrl: 'http://localhost:4200',
};
