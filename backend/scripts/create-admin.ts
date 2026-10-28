/**
 * Secure initial admin setup — there are NO default admin accounts or passwords.
 *
 *   npm run admin:create                    interactive prompts (password hidden)
 *   npm run admin:create -- --reset         reset the password of an existing admin
 *
 * Non-interactive (CI): set ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_ROLE in the environment
 * for a single run. Do not store ADMIN_PASSWORD in .env.
 */
import readline from 'node:readline';
import { z } from 'zod';
import { closePool } from '../src/config/database';
import { adminRepository } from '../src/repositories/admin.repository';
import { authService } from '../src/services/auth.service';
import { adminPasswordSchema } from '../src/validators/auth.validator';

function ask(question: string, hidden = false): Promise<string> {
  if (!process.stdin.isTTY) {
    return Promise.reject(new Error(`Missing input for "${question.trim()}" — run interactively or set the ADMIN_* variables.`));
  }
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (hidden) {
      const r = rl as unknown as { _writeToOutput: (s: string) => void; output: NodeJS.WriteStream };
      r._writeToOutput = (s: string) => {
        if (s.includes(question)) r.output.write(s);
        else if (s === '\r\n' || s === '\n' || s === '\r') r.output.write('\n');
        else r.output.write('*');
      };
    }
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function main() {
  const reset = process.argv.includes('--reset');
  const email = z.email().parse((process.env.ADMIN_EMAIL ?? (await ask('Admin email: '))).toLowerCase());
  const existing = await adminRepository.findByEmail(email);

  if (reset && !existing) throw new Error('No admin with that email exists.');
  if (!reset && existing) throw new Error('An admin with that email already exists. Use --reset to change the password.');

  let name = '';
  let role: 'admin' | 'editor' = 'admin';
  if (!reset) {
    name = z.string().trim().min(2).max(120).parse(process.env.ADMIN_NAME ?? (await ask('Full name: ')));
    const nonInteractive = Boolean(process.env.ADMIN_EMAIL);
    role = z
      .enum(['admin', 'editor'])
      .parse(process.env.ADMIN_ROLE ?? (nonInteractive ? 'admin' : (await ask('Role (admin/editor) [admin]: ')) || 'admin'));
  }

  let password = process.env.ADMIN_PASSWORD;
  if (!password) {
    password = await ask('Password (min 12 chars, upper/lower/digit): ', true);
    const confirm = await ask('Confirm password: ', true);
    if (password !== confirm) throw new Error('Passwords do not match.');
  }
  const check = adminPasswordSchema.safeParse(password);
  if (!check.success) throw new Error(check.error.issues[0].message);

  const hash = await authService.hashPassword(password);
  if (reset) {
    await adminRepository.updatePassword(existing!.id, hash);
    console.log(`✓ Password reset for ${email}. Existing sessions were signed out.`);
  } else {
    const id = await adminRepository.create(name, email, hash, role);
    console.log(`✓ Created ${role} #${id} (${email}).`);
  }
}

main()
  .catch((err) => {
    console.error('✗', err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => closePool());
