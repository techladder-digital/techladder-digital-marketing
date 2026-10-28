import crypto from 'node:crypto';
import { env } from '../config/env';
import { DeliveryStatus, Enquiry } from '../types/models';
import { NotificationError } from './email.service';

/**
 * WhatsApp Business Platform (Cloud API) integration.
 *
 * Business-initiated messages to a number that has not messaged you in the last 24 hours
 * MUST use an approved message template. This service always sends the template named in
 * WHATSAPP_TEMPLATE_NAME with five body parameters:
 *   {{1}} enquiry id, {{2}} customer name, {{3}} service, {{4}} customer phone, {{5}} preferred contact method
 *
 * A successful API response only means Meta ACCEPTED the request. Actual sent/delivered/read/failed
 * states arrive later via the webhook (see parseStatusWebhook) and are stored separately.
 */

// Meta error codes that indicate throttling or temporary failures.
const RETRYABLE_CODES = new Set([1, 2, 4, 17, 341, 80007, 130429, 131000, 131016, 131048, 131056]);

/** Template parameters may not contain newlines, tabs or more than 4 consecutive spaces. */
export function templateText(value: string, max = 200): string {
  const cleaned = value.replace(/[\r\n\t]+/g, ' ').replace(/ {2,}/g, ' ').trim().slice(0, max);
  return cleaned || '-';
}

export function buildTemplatePayload(e: Enquiry) {
  const method = { email: 'Email', whatsapp: 'WhatsApp', both: 'Email and WhatsApp' }[e.preferredContactMethod];
  return {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: env.WHATSAPP_BUSINESS_RECIPIENT,
    type: 'template',
    template: {
      name: env.WHATSAPP_TEMPLATE_NAME,
      language: { code: env.WHATSAPP_TEMPLATE_LANGUAGE },
      components: [
        {
          type: 'body',
          parameters: [String(e.id), e.fullName, e.serviceName, e.phone, method].map((t) => ({
            type: 'text',
            text: templateText(t),
          })),
        },
      ],
    },
  };
}

interface GraphErrorBody {
  error?: { message?: string; code?: number; error_subcode?: number; fbtrace_id?: string };
}

export const whatsappService = {
  isConfigured(): boolean {
    return env.whatsappEnabled;
  },

  async sendEnquiryAlert(enquiry: Enquiry, fetchImpl: typeof fetch = fetch): Promise<{ messageId: string }> {
    if (!env.whatsappEnabled) throw new NotificationError('WhatsApp is not configured', false);
    const url = `https://graph.facebook.com/${env.WHATSAPP_API_VERSION}/${encodeURIComponent(env.WHATSAPP_PHONE_NUMBER_ID!)}/messages`;

    let response: Response;
    try {
      response = await fetchImpl(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(buildTemplatePayload(enquiry)),
        signal: AbortSignal.timeout(10_000),
      });
    } catch (err) {
      throw new NotificationError(`WhatsApp request failed: ${err instanceof Error ? err.message : 'network error'}`, true);
    }

    let body: unknown = null;
    try {
      body = await response.json();
    } catch {
      /* non-JSON body */
    }

    if (!response.ok) {
      const ge = (body as GraphErrorBody | null)?.error;
      const code = ge?.code;
      const retryable = response.status === 429 || response.status >= 500 || (code !== undefined && RETRYABLE_CODES.has(code));
      throw new NotificationError(
        `WhatsApp API error HTTP ${response.status}${code ? ` code ${code}` : ''}: ${ge?.message ?? 'unknown error'}`,
        retryable,
      );
    }

    const messageId = (body as { messages?: { id?: string }[] } | null)?.messages?.[0]?.id;
    if (!messageId) throw new NotificationError('WhatsApp API response did not include a message id', true);
    return { messageId };
  },

  /** Verifies Meta's X-Hub-Signature-256 header against the raw request body. */
  verifySignature(rawBody: Buffer | undefined, header: string | undefined): boolean {
    if (!env.WHATSAPP_APP_SECRET || !rawBody || !header || !header.startsWith('sha256=')) return false;
    const expected = Buffer.from(
      'sha256=' + crypto.createHmac('sha256', env.WHATSAPP_APP_SECRET).update(rawBody).digest('hex'),
    );
    const received = Buffer.from(header);
    return expected.length === received.length && crypto.timingSafeEqual(expected, received);
  },

  /** Extracts message status updates from a webhook payload. */
  parseStatusWebhook(payload: unknown): { messageId: string; status: DeliveryStatus; error: string | null }[] {
    const out: { messageId: string; status: DeliveryStatus; error: string | null }[] = [];
    const entries = (payload as { entry?: unknown[] })?.entry;
    if (!Array.isArray(entries)) return out;
    for (const entry of entries) {
      const changes = (entry as { changes?: unknown[] })?.changes;
      if (!Array.isArray(changes)) continue;
      for (const change of changes) {
        const statuses = (change as { value?: { statuses?: unknown[] } })?.value?.statuses;
        if (!Array.isArray(statuses)) continue;
        for (const s of statuses) {
          const st = s as { id?: unknown; status?: unknown; errors?: { code?: number; title?: string }[] };
          if (typeof st.id !== 'string' || typeof st.status !== 'string') continue;
          if (!['sent', 'delivered', 'read', 'failed'].includes(st.status)) continue;
          const err = st.errors?.[0];
          out.push({
            messageId: st.id.slice(0, 190),
            status: st.status as DeliveryStatus,
            error: err ? `code ${err.code ?? '?'}: ${String(err.title ?? 'failed').slice(0, 300)}` : null,
          });
        }
      }
    }
    return out;
  },
};
