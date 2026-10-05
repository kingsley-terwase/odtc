import { z } from 'zod';
import { env } from '../config/env.js';

const endpoint = 'https://sendlib.samueltuoyo.com/api/send';
const messageSchema = z.object({
  to: z.email(),
  subject: z.string().trim().min(1).max(200),
  html: z.string().min(1).optional(),
  text: z.string().min(1).optional(),
}).refine(message => Boolean(message.html || message.text), 'Email needs HTML or plain-text content');

export type EmailMessage = z.infer<typeof messageSchema>;
export class EmailDeliveryError extends Error {
  constructor(public readonly code: 'EMAIL_NOT_CONFIGURED' | 'INVALID_EMAIL' | 'EMAIL_UNAVAILABLE' | 'EMAIL_REJECTED') {
    const messages = {
      EMAIL_NOT_CONFIGURED: 'Sendlib API key and sender email must be configured',
      INVALID_EMAIL: 'Email recipient, subject or content is invalid',
      EMAIL_UNAVAILABLE: 'Unable to reach Sendlib within the allowed time',
      EMAIL_REJECTED: 'Sendlib rejected the email request',
    };
    super(messages[code]);
  }
}

type SendlibConfig = { apiKey?: string; from?: string; timeoutMs: number };

// Injectable transport keeps tests offline and allows additional providers later.
export function createSendlibMailer(config: SendlibConfig, transport: typeof fetch = fetch) {
  return async (message: EmailMessage) => {
    if (!config.apiKey || !config.from) throw new EmailDeliveryError('EMAIL_NOT_CONFIGURED');
    if (!z.email().safeParse(config.from).success) throw new EmailDeliveryError('EMAIL_NOT_CONFIGURED');
    const parsed = messageSchema.safeParse(message);
    if (!parsed.success) throw new EmailDeliveryError('INVALID_EMAIL');
    let response: Response;
    try {
      response = await transport(endpoint, {
        method: 'POST',
        headers: { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: config.from, ...parsed.data }),
        signal: AbortSignal.timeout(config.timeoutMs),
        redirect: 'error',
      });
    } catch {
      // Provider/network errors may include sensitive details; never forward them.
      throw new EmailDeliveryError('EMAIL_UNAVAILABLE');
    }
    await response.body?.cancel();
    if (!response.ok) throw new EmailDeliveryError('EMAIL_REJECTED');
    // Provider acceptance does not guarantee inbox delivery.
    return { provider: 'sendlib' as const, accepted: true as const };
  };
}

export const sendTransactionalEmail = createSendlibMailer({
  apiKey: env.SENDLIB_API_KEY,
  from: env.SENDLIB_FROM_EMAIL,
  timeoutMs: env.EMAIL_TIMEOUT_MS,
});
