import { isPlaceholder, loadEnv } from '../src/config/env';

const base = {
  NODE_ENV: 'development',
  DB_HOST: 'localhost',
  DB_USER: 'app',
  DB_PASSWORD: 'pw',
  DB_NAME: 'techladder_db',
  JWT_SECRET: 'a'.repeat(40),
};

describe('environment configuration', () => {
  it('loads valid configuration with safe defaults', () => {
    const env = loadEnv(base);
    expect(env.PORT).toBe(3000);
    expect(env.DB_PORT).toBe(3306);
    expect(env.corsOrigins).toEqual(['http://localhost:4200']);
    expect(env.emailEnabled).toBe(false);
    expect(env.whatsappEnabled).toBe(false);
  });

  it('fails fast when essential database settings are missing', () => {
    expect(() => loadEnv({ ...base, DB_HOST: undefined })).toThrow(/DB_HOST/);
    expect(() => loadEnv({ ...base, DB_NAME: 'bad-name;drop' })).toThrow(/DB_NAME/);
  });

  it('rejects a short JWT secret', () => {
    expect(() => loadEnv({ ...base, JWT_SECRET: 'short' })).toThrow(/JWT_SECRET/);
  });

  it('refuses placeholder secrets in production', () => {
    expect(() => loadEnv({ ...base, NODE_ENV: 'production', JWT_SECRET: 'replace_me_with_a_long_random_secret_at_least_32_chars' })).toThrow();
    expect(() => loadEnv({ ...base, NODE_ENV: 'production', DB_PASSWORD: 'replace_me' })).toThrow(/DB_PASSWORD/);
  });

  it('treats .env.example placeholders as "not configured" for optional integrations', () => {
    expect(isPlaceholder('replace_me')).toBe(true);
    expect(isPlaceholder('your_smtp_host')).toBe(true);
    const env = loadEnv({ ...base, SMTP_HOST: 'your_smtp_host', BUSINESS_EMAIL: 'your_business_email', WHATSAPP_ACCESS_TOKEN: 'replace_me' });
    expect(env.emailEnabled).toBe(false);
    expect(env.whatsappEnabled).toBe(false);
  });

  it('enables integrations only when all required values are present', () => {
    const env = loadEnv({
      ...base,
      SMTP_HOST: 'smtp.example.com',
      BUSINESS_EMAIL: 'owner@example.com',
      WHATSAPP_ACCESS_TOKEN: 'EAAB-token',
      WHATSAPP_PHONE_NUMBER_ID: '123',
      WHATSAPP_BUSINESS_RECIPIENT: '919876543210',
      WHATSAPP_TEMPLATE_NAME: 'new_enquiry_alert',
    });
    expect(env.emailEnabled).toBe(true);
    expect(env.whatsappEnabled).toBe(true);
  });

  it('parses a comma-separated CORS allowlist and rejects invalid origins', () => {
    expect(loadEnv({ ...base, FRONTEND_URL: 'https://a.com, https://www.a.com/' }).corsOrigins).toEqual([
      'https://a.com',
      'https://www.a.com',
    ]);
    expect(() => loadEnv({ ...base, FRONTEND_URL: 'not a url' })).toThrow(/FRONTEND_URL/);
  });
});
