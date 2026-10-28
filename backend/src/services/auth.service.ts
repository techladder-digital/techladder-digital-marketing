import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { adminRepository } from '../repositories/admin.repository';
import { AuthenticatedAdmin } from '../types/models';
import { ApiError } from '../utils/api-error';

const BCRYPT_ROUNDS = 12;
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MINUTES = 15;
const ISSUER = 'techladder-api';
const AUDIENCE = 'techladder-admin';

// Used to keep response timing similar when the email does not exist.
const DUMMY_HASH = bcrypt.hashSync('timing-equaliser-not-a-real-password', BCRYPT_ROUNDS);

interface TokenPayload {
  sub: string;
  ver: number;
  role: string;
}

export interface LoginResult {
  token: string;
  expiresAt: string;
  admin: AuthenticatedAdmin;
}

export const authService = {
  hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, BCRYPT_ROUNDS);
  },

  async login(email: string, password: string): Promise<LoginResult> {
    const genericError = ApiError.unauthorized('Invalid email or password');
    const admin = await adminRepository.findByEmail(email);

    if (!admin) {
      await bcrypt.compare(password, DUMMY_HASH);
      throw genericError;
    }
    if (admin.locked_until && new Date(admin.locked_until).getTime() > Date.now()) {
      throw new ApiError(423, 'Account temporarily locked after repeated failed sign-ins. Try again later.', 'ACCOUNT_LOCKED');
    }

    const valid = await bcrypt.compare(password, admin.password_hash);
    if (!valid || admin.is_active !== 1) {
      if (admin.is_active === 1) {
        const willLock = admin.failed_login_count + 1 >= MAX_FAILED_ATTEMPTS;
        await adminRepository.recordFailedLogin(admin.id, willLock ? new Date(Date.now() + LOCK_MINUTES * 60_000) : null);
      }
      throw genericError;
    }

    await adminRepository.recordSuccessfulLogin(admin.id);
    const expiresInSeconds = env.JWT_EXPIRES_IN_MINUTES * 60;
    const token = jwt.sign({ ver: admin.token_version, role: admin.role } satisfies Omit<TokenPayload, 'sub'>, env.JWT_SECRET, {
      algorithm: 'HS256',
      subject: String(admin.id),
      issuer: ISSUER,
      audience: AUDIENCE,
      expiresIn: expiresInSeconds,
    });
    return {
      token,
      expiresAt: new Date(Date.now() + expiresInSeconds * 1000).toISOString(),
      admin: { id: admin.id, name: admin.name, email: admin.email, role: admin.role },
    };
  },

  /** Returns the admin for a valid token, or null. Checks the DB so logout/deactivation take effect immediately. */
  async verifyAccessToken(token: string): Promise<AuthenticatedAdmin | null> {
    let payload: TokenPayload;
    try {
      payload = jwt.verify(token, env.JWT_SECRET, {
        algorithms: ['HS256'],
        issuer: ISSUER,
        audience: AUDIENCE,
      }) as unknown as TokenPayload;
    } catch {
      return null;
    }
    const id = Number(payload.sub);
    if (!Number.isInteger(id) || id <= 0) return null;
    const admin = await adminRepository.findById(id);
    if (!admin || admin.is_active !== 1 || admin.token_version !== payload.ver) return null;
    return { id: admin.id, name: admin.name, email: admin.email, role: admin.role };
  },

  /** Revokes all outstanding tokens for this admin. */
  async logout(adminId: number): Promise<void> {
    await adminRepository.bumpTokenVersion(adminId);
  },
};
