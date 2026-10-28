import nodemailer, { Transporter } from 'nodemailer';
import { env } from '../config/env';
import { Enquiry } from '../types/models';
import { escapeHtml } from '../utils/html';

export class NotificationError extends Error {
  constructor(message: string, public readonly retryable: boolean) {
    super(message);
    this.name = 'NotificationError';
  }
}

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD ?? '' } : undefined,
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
      requireTLS: !env.SMTP_SECURE && env.isProduction,
    });
  }
  return transporter;
}

const LABELS: Record<string, string> = {
  digital_marketing: 'Digital Marketing',
  website: 'Website',
  software: 'Software',
  email: 'Email',
  whatsapp: 'WhatsApp',
  both: 'Email & WhatsApp',
};

export function buildEnquiryEmail(e: Enquiry) {
  const rows: [string, string][] = [
    ['Enquiry ID', `#${e.id}`],
    ['Name', e.fullName],
    ['Business', e.businessName ?? '—'],
    ['Email', e.email],
    ['Phone', e.phone],
    ['Project type', LABELS[e.projectType] ?? e.projectType],
    ['Service', e.serviceName],
    ['Budget', e.budgetRange ?? '—'],
    ['Preferred contact', LABELS[e.preferredContactMethod] ?? e.preferredContactMethod],
    ['Received (UTC)', new Date(e.createdAt).toISOString()],
  ];
  const text =
    rows.map(([k, v]) => `${k}: ${v}`).join('\n') + `\n\nMessage:\n${e.message}\n`;
  const html = `
  <div style="font-family:Arial,Helvetica,sans-serif;color:#111111;max-width:640px">
    <h2 style="margin:0 0 4px">New website enquiry #${e.id}</h2>
    <div style="height:4px;width:64px;background:#FF7900;margin:8px 0 16px"></div>
    <table cellpadding="6" style="border-collapse:collapse;width:100%">
      ${rows
        .map(
          ([k, v]) =>
            `<tr><td style="border-bottom:1px solid #eee;font-weight:bold;width:170px">${escapeHtml(k)}</td><td style="border-bottom:1px solid #eee">${escapeHtml(v)}</td></tr>`,
        )
        .join('')}
    </table>
    <h3 style="margin:20px 0 6px">Message</h3>
    <p style="white-space:pre-wrap;margin:0">${escapeHtml(e.message)}</p>
  </div>`;
  // Header injection is not possible: names are only placed in the body and the subject is sanitised.
  const subject = `New enquiry #${e.id}: ${e.serviceName}`.replace(/[\r\n]+/g, ' ').slice(0, 150);
  return { subject, text, html };
}

export const emailService = {
  isConfigured(): boolean {
    return env.emailEnabled;
  },

  /** Sends the enquiry alert. Resolves with the SMTP message id when the server ACCEPTS the message. */
  async sendEnquiryAlert(enquiry: Enquiry): Promise<{ messageId: string | null }> {
    if (!env.emailEnabled) throw new NotificationError('Email is not configured', false);
    const { subject, text, html } = buildEnquiryEmail(enquiry);
    try {
      const info = await getTransporter().sendMail({
        from: env.EMAIL_FROM ?? env.SMTP_USER ?? env.BUSINESS_EMAIL,
        to: env.BUSINESS_EMAIL,
        replyTo: { name: enquiry.fullName.replace(/[\r\n"<>]/g, ''), address: enquiry.email },
        subject,
        text,
        html,
      });
      if (Array.isArray(info.rejected) && info.rejected.length > 0) {
        throw new NotificationError('SMTP server rejected the recipient address', false);
      }
      return { messageId: info.messageId ?? null };
    } catch (err) {
      if (err instanceof NotificationError) throw err;
      const e = err as { responseCode?: number; code?: string; message?: string };
      // 5xx SMTP responses (except auth problems that an admin may fix) are permanent; network/4xx are retryable.
      const permanent = typeof e.responseCode === 'number' && e.responseCode >= 500 && e.responseCode !== 535;
      throw new NotificationError(`SMTP error${e.responseCode ? ` ${e.responseCode}` : ''}${e.code ? ` (${e.code})` : ''}: ${e.message ?? 'unknown'}`, !permanent);
    }
  },

  /** Checks SMTP connectivity/credentials without sending mail (admin integration status). */
  async verifyConnection(): Promise<{ ok: boolean; error?: string }> {
    if (!env.emailEnabled) return { ok: false, error: 'Not configured' };
    try {
      await getTransporter().verify();
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message.slice(0, 200) : 'Verification failed' };
    }
  },
};
