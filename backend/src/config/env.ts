import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().min(1).default('127.0.0.1'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  CORS_ORIGINS: z.string().default(''),
  MAPBOX_ACCESS_TOKEN: z.preprocess(value => value === '' ? undefined : value, z.string().min(1).optional()),
  PAYSTACK_SECRET_KEY: z.preprocess(value => value === '' ? undefined : value, z.string().min(1).optional()),
  PAYSTACK_ALLOW_LIVE: z.enum(['true', 'false']).default('false').transform(value => value === 'true'),
  PAYSTACK_CALLBACK_URL: z.preprocess(value => value === '' ? undefined : value, z.url().optional()),
  QUOTE_TTL_MINUTES: z.coerce.number().int().min(1).max(60).default(15),
  EMAIL_VERIFICATION_URL: z.url().refine(value => { try { return ['http:', 'https:'].includes(new URL(value).protocol); } catch { return false; } }, 'Must be HTTP or HTTPS').default('http://localhost:5173/verify-email'),
  VERIFICATION_TTL_MINUTES: z.coerce.number().int().min(1).max(1440).default(30),
  VERIFICATION_COOLDOWN_SECONDS: z.coerce.number().int().min(30).max(3600).default(60),
  SENDLIB_API_KEY: z.preprocess(value => value === '' ? undefined : value, z.string().min(1).optional()),
  SENDLIB_FROM_EMAIL: z.preprocess(value => value === '' ? undefined : value, z.email().optional()),
  EMAIL_TIMEOUT_MS: z.coerce.number().int().min(1000).max(60000).default(10000),
  SESSION_TTL_HOURS: z.coerce.number().int().min(1).max(720).default(24),
  GOOGLE_CLIENT_ID: z.string().min(1).optional(),
  DATABASE_URL: z.string().url().refine(value => /^postgres(ql)?:\/\//.test(value), 'Must be a PostgreSQL URL').optional(),
}).superRefine((values, context) => {
  let verificationUrl: URL;
  try { verificationUrl = new URL(values.EMAIL_VERIFICATION_URL); } catch { return; }
  if (values.NODE_ENV === 'production' && (verificationUrl.protocol !== 'https:' || ['localhost', '127.0.0.1', '[::1]'].includes(verificationUrl.hostname))) {
    context.addIssue({ code: 'custom', path: ['EMAIL_VERIFICATION_URL'], message: 'Production requires a public HTTPS verification URL' });
  }
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  const fields = parsed.error.issues.map(issue => issue.path.join('.')).join(', ');
  throw new Error(`Invalid environment configuration: ${fields}`);
}

export const env = {
  ...parsed.data,
  corsOrigins: parsed.data.CORS_ORIGINS.split(',').map(value => value.trim()).filter(Boolean),
};
