/**
 * Real-database integration tests (enquiry persistence, SQL injection, feedback/portfolio rules).
 *
 * Runs ONLY when TEST_DB_NAME is set and ends with "_test", so it can never touch production data:
 *   $env:TEST_DB_NAME="techladder_test"; $env:TEST_DB_USER="..."; $env:TEST_DB_PASSWORD="..."; npm run test:integration
 */
import fs from 'node:fs';
import path from 'node:path';
import mysql from 'mysql2/promise';
import request from 'supertest';

const dbName = process.env.TEST_DB_NAME ?? '';
const enabled = /_test$/.test(dbName);
const d = enabled ? describe : describe.skip;

d('integration: MySQL', () => {
  let app: import('express').Express;
  let closePool: () => Promise<void>;
  let conn: mysql.Connection;

  beforeAll(async () => {
    conn = await mysql.createConnection({
      host: process.env.DB_HOST, port: Number(process.env.DB_PORT), user: process.env.DB_USER,
      password: process.env.DB_PASSWORD, database: dbName, multipleStatements: true,
    });
    // Fresh schema in the TEST database only.
    await conn.query('SET FOREIGN_KEY_CHECKS = 0');
    for (const t of ['media_files', 'admin_audit_logs', 'notification_logs', 'enquiries', 'feedback', 'portfolio_projects', 'social_links', 'services', 'site_settings', 'admins']) {
      await conn.query(`DROP TABLE IF EXISTS \`${t}\``);
    }
    await conn.query('SET FOREIGN_KEY_CHECKS = 1');
    const dir = path.join(__dirname, '..', 'migrations');
    for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.sql')).sort()) {
      await conn.query(fs.readFileSync(path.join(dir, f), 'utf8'));
    }
    app = (await import('../src/app')).createApp();
    closePool = (await import('../src/config/database')).closePool;
  });

  afterAll(async () => {
    await closePool?.();
    await conn?.end();
  });

  it('reports a healthy database', async () => {
    const res = await request(app).get('/api/health');
    expect(res.body.data).toMatchObject({ status: 'ok', database: 'up' });
  });

  it('persists an enquiry and creates notification rows (skipped when not configured)', async () => {
    const res = await request(app).post('/api/enquiries').send({
      fullName: 'Integration User', email: 'int@example.com', phone: '+91 90000 00000', projectType: 'software',
      serviceName: 'Software Development', message: 'Integration test enquiry message.', preferredContactMethod: 'email',
      consentToContact: true,
    });
    expect(res.status).toBe(201);
    const id = res.body.data.enquiryId;
    const [rows] = await conn.query('SELECT full_name, enquiry_status FROM enquiries WHERE id = ?', [id]);
    expect(rows).toEqual([{ full_name: 'Integration User', enquiry_status: 'new' }]);
    const [logs] = await conn.query('SELECT channel, delivery_status FROM notification_logs WHERE enquiry_id = ? ORDER BY channel', [id]);
    expect(logs).toEqual([
      { channel: 'email', delivery_status: 'skipped' },
      { channel: 'whatsapp', delivery_status: 'skipped' },
    ]);
  });

  it('stores SQL-injection payloads as plain text and leaves tables intact', async () => {
    const payload = "Robert'); DROP TABLE enquiries;--";
    const res = await request(app).post('/api/enquiries').send({
      fullName: payload, email: 'r@example.com', phone: '9876543210', projectType: 'website',
      serviceName: "' OR '1'='1", message: '1; DELETE FROM admins; -- please', preferredContactMethod: 'both', consentToContact: true,
    });
    expect(res.status).toBe(201);
    const [rows] = await conn.query('SELECT full_name, service_name FROM enquiries WHERE id = ?', [res.body.data.enquiryId]);
    expect(rows).toEqual([{ full_name: payload, service_name: "' OR '1'='1" }]);
    const [tables] = await conn.query("SHOW TABLES LIKE 'enquiries'");
    expect((tables as unknown[]).length).toBe(1);
  });

  it('enforces the rating CHECK constraint at the database level', async () => {
    await expect(conn.query(
      "INSERT INTO feedback (customer_name, service_category, project_name, rating, feedback_message) VALUES ('a','digital_marketing','p',9,'m')",
    )).rejects.toThrow();
  });

  it('only returns published portfolio projects and approved+consented feedback', async () => {
    await conn.query(`INSERT INTO portfolio_projects (title, category, description, is_published) VALUES
      ('Draft', 'website_development', 'Not yet public project', 0),
      ('Live', 'website_development', 'Public project description', 1)`);
    await conn.query(`INSERT INTO feedback (customer_name, service_category, project_name, rating, feedback_message, consent_to_publish, moderation_status) VALUES
      ('Pending', 'digital_marketing', 'p', 5, 'pending one', 1, 'pending'),
      ('NoConsent', 'digital_marketing', 'p', 5, 'approved no consent', 0, 'approved'),
      ('Visible', 'digital_marketing', 'p', 4, 'approved with consent', 1, 'approved')`);
    const portfolio = await request(app).get('/api/portfolio');
    expect(portfolio.body.data.map((p: { title: string }) => p.title)).toEqual(['Live']);
    const feedback = await request(app).get('/api/feedback/public');
    expect(feedback.body.data.map((f: { customerName: string }) => f.customerName)).toEqual(['Visible']);
  });

  it('serves the seeded service catalogue', async () => {
    const res = await request(app).get('/api/services');
    expect(res.body.data).toHaveLength(25);
  });
});
