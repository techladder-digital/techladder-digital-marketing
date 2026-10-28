import os from 'node:os';
import path from 'node:path';

// Runs before every test file. Uses a dedicated TEST database — never production.
process.env.NODE_ENV = 'test';
process.env.DB_HOST = process.env.TEST_DB_HOST ?? 'localhost';
process.env.DB_PORT = process.env.TEST_DB_PORT ?? '3306';
process.env.DB_USER = process.env.TEST_DB_USER ?? 'techladder_test_user';
process.env.DB_PASSWORD = process.env.TEST_DB_PASSWORD ?? '';
process.env.DB_NAME = process.env.TEST_DB_NAME ?? 'techladder_test';
process.env.JWT_SECRET = 'test-only-secret-0123456789-abcdefghijklmnop';
process.env.FRONTEND_URL = 'http://localhost:4200';
for (const key of [
  'SMTP_HOST', 'SMTP_USER', 'SMTP_PASSWORD', 'BUSINESS_EMAIL', 'EMAIL_FROM',
  'WHATSAPP_ACCESS_TOKEN', 'WHATSAPP_PHONE_NUMBER_ID', 'WHATSAPP_BUSINESS_RECIPIENT', 'WHATSAPP_TEMPLATE_NAME',
  'WHATSAPP_APP_SECRET', 'WHATSAPP_WEBHOOK_VERIFY_TOKEN', 'YOUTUBE_API_KEY', 'META_GRAPH_ACCESS_TOKEN',
]) {
  delete process.env[key];
}
// Uploads go to a throwaway temp folder during tests.
process.env.UPLOAD_DIR = path.join(os.tmpdir(), `techladder-test-uploads-${process.pid}`);
process.env.MAX_IMAGE_UPLOAD_MB = '1';
process.env.MAX_VIDEO_UPLOAD_MB = '2';
