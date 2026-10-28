import { Request, Response } from 'express';
import { authService } from '../services/auth.service';
import { auditService } from '../services/audit.service';
import { ok } from '../utils/response';
import { loginSchema } from '../validators/auth.validator';
import { parse } from '../validators/parse';
import { adminRepository } from '../repositories/admin.repository';

export const authController = {
  async login(req: Request, res: Response) {
    const { email, password } = parse(loginSchema, req.body);
    try {
      const result = await authService.login(email, password);
      await auditService.log(result.admin.id, 'auth.login', 'admin', result.admin.id);
      res.setHeader('Cache-Control', 'no-store');
      ok(res, result);
    } catch (err) {
      const admin = await adminRepository.findByEmail(email).catch(() => null);
      if (admin) await auditService.log(admin.id, 'auth.login_failed', 'admin', admin.id);
      throw err;
    }
  },

  async logout(req: Request, res: Response) {
    await authService.logout(req.admin!.id);
    await auditService.log(req.admin!.id, 'auth.logout', 'admin', req.admin!.id);
    ok(res, { loggedOut: true });
  },

  async me(req: Request, res: Response) {
    ok(res, req.admin);
  },
};
