import jwt from 'jsonwebtoken';
import { Enquiry } from '../src/types/models';

export const TEST_JWT_SECRET = 'test-only-secret-0123456789-abcdefghijklmnop';

export function makeEnquiry(overrides: Partial<Enquiry> = {}): Enquiry {
  return {
    id: 42,
    fullName: 'Priya Kumar',
    businessName: 'Kumar Traders',
    email: 'priya@example.com',
    phone: '+91 98765 43210',
    projectType: 'website',
    serviceName: 'Business Website Development',
    budgetRange: 'Not sure yet',
    message: 'We need a new website for our shop.',
    preferredContactMethod: 'both',
    consentToContact: true,
    enquiryStatus: 'new',
    createdAt: new Date('2026-01-01T10:00:00Z'),
    updatedAt: new Date('2026-01-01T10:00:00Z'),
    ...overrides,
  };
}

export const validEnquiryBody = {
  fullName: 'Priya Kumar',
  businessName: 'Kumar Traders',
  email: 'priya@example.com',
  phone: '+91 98765 43210',
  projectType: 'website',
  serviceName: 'Business Website Development',
  budgetRange: 'Not sure yet',
  message: 'We need a new website for our shop.',
  preferredContactMethod: 'both',
  consentToContact: true,
};

/** Signs a token the same way authService does (for route tests with a mocked admin repository). */
export function signTestToken(id: number, role: 'admin' | 'editor', ver = 0, opts: jwt.SignOptions = {}) {
  return jwt.sign({ ver, role }, TEST_JWT_SECRET, {
    algorithm: 'HS256',
    subject: String(id),
    issuer: 'techladder-api',
    audience: 'techladder-admin',
    expiresIn: 600,
    ...opts,
  });
}

export function adminRow(id: number, role: 'admin' | 'editor', extra: Record<string, unknown> = {}) {
  return {
    id,
    name: role === 'admin' ? 'Admin User' : 'Editor User',
    email: `${role}@example.com`,
    password_hash: 'x',
    role,
    is_active: 1,
    token_version: 0,
    failed_login_count: 0,
    locked_until: null,
    ...extra,
  };
}
