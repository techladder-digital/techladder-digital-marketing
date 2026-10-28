/*
 * SQL injection resistance: user input must only ever travel as bound parameters,
 * never as part of the SQL text.
 */
const executeMock = jest.fn();
jest.mock('mysql2/promise', () => {
  const pool = { execute: executeMock, getConnection: jest.fn(), end: jest.fn(), pool: { on: jest.fn() } };
  return { __esModule: true, default: { createPool: () => pool }, createPool: () => pool };
});

import { enquiryRepository } from '../src/repositories/enquiry.repository';
import { feedbackRepository } from '../src/repositories/feedback.repository';
import { portfolioRepository } from '../src/repositories/portfolio.repository';
import { adminRepository } from '../src/repositories/admin.repository';
import { settingsRepository } from '../src/repositories/settings.repository';
import { createEnquirySchema } from '../src/validators/enquiry.validator';
import { validEnquiryBody } from './helpers';

const PAYLOADS = [
  "Robert'); DROP TABLE enquiries;--",
  "' OR '1'='1",
  '1; DELETE FROM admins; --',
  "admin'--",
  '%_\\',
];

function allSql(): string {
  return executeMock.mock.calls.map((c) => String(c[0])).join('\n');
}

describe('SQL injection resistance', () => {
  beforeEach(() => {
    executeMock.mockReset();
    executeMock.mockImplementation(async (sql: string) => {
      if (/COUNT\(\*\)/.test(sql)) return [[{ total: 0 }]];
      if (/^\s*(INSERT|UPDATE|DELETE)/i.test(sql)) return [{ insertId: 1, affectedRows: 1 }];
      return [[]];
    });
  });

  it.each(PAYLOADS)('stores enquiry text %p only as a bound parameter', async (payload) => {
    const input = createEnquirySchema.parse({ ...validEnquiryBody, fullName: `X ${payload}`.slice(0, 120), message: `Message ${payload}` });
    const { website: _w, ...data } = input;
    const conn = { execute: executeMock } as never;
    await enquiryRepository.insertWithNotifications(conn, data, ['email']);
    expect(allSql()).not.toContain(payload);
    const params = executeMock.mock.calls[0][1] as unknown[];
    expect(params).toContain(`X ${payload}`.slice(0, 120));
    expect(params).toContain(`Message ${payload}`);
  });

  it.each(PAYLOADS)('binds admin search term %p and escapes LIKE wildcards', async (payload) => {
    await enquiryRepository.list({ page: 1, pageSize: 20, search: payload });
    expect(allSql()).not.toContain(payload);
    const params = executeMock.mock.calls[0][1] as string[];
    expect(params[0].startsWith('%') && params[0].endsWith('%')).toBe(true);
    if (payload === '%_\\') expect(params[0]).toBe('%\\%\\_\\\\%');
  });

  it('binds login email lookups', async () => {
    await adminRepository.findByEmail("x' OR 1=1 --");
    expect(allSql()).not.toContain('OR 1=1');
    expect(executeMock.mock.calls[0][1]).toEqual(["x' OR 1=1 --"]);
  });

  it('binds feedback, portfolio and settings values', async () => {
    await feedbackRepository.insert({
      customerName: PAYLOADS[0], businessName: null, serviceCategory: 'digital_marketing',
      projectName: PAYLOADS[1], rating: 5, feedbackMessage: PAYLOADS[2], consentToPublish: true,
    });
    await portfolioRepository.findPublishedById(1);
    await settingsRepository.getMany(['company_name', 'footer_text']);
    for (const p of PAYLOADS.slice(0, 3)) expect(allSql()).not.toContain(p);
  });
});
