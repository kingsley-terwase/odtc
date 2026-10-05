import { Router, type RequestHandler } from 'express';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import { ApiError } from '../../lib/api-error.js';
import * as service from './auth.service.js';
import { requestVerification, verifyEmail, type VerificationSender } from './verification.service.js';

const email = z.string().trim().toLowerCase().pipe(z.email().max(254));
const password = z.string().min(12).max(128);
const registration = z.object({ email, name: z.string().trim().min(1).max(120), password }).strict();
const credentials = z.object({ email, password: z.string().min(1).max(128) }).strict();
const google = z.object({ idToken: z.string().min(1).max(10000) }).strict();

function parse<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) throw new ApiError(400, 'VALIDATION_ERROR', result.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join('; '));
  return result.data;
}

export const requireAuth: RequestHandler = async (req, res, next) => {
  const header = req.get('authorization');
  const match = header?.match(/^Bearer ([A-Za-z0-9_-]+)$/i);
  if (!match?.[1]) throw new ApiError(401, 'UNAUTHORIZED', 'A Bearer session token is required');
  res.locals.auth = await service.authenticate(match[1]);
  next();
};

export const requireVerifiedEmail: RequestHandler = (_req, res, next) => {
  if (!res.locals.auth) throw new ApiError(401, 'UNAUTHORIZED', 'A valid session is required');
  if (!res.locals.auth.user.emailVerifiedAt) throw new ApiError(403, 'EMAIL_NOT_VERIFIED', 'Verify your email before booking');
  next();
};

export function createAuthRouter(options: { sendEmail?: VerificationSender } = {}) {
  const router = Router();
  router.use((_req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: 'draft-8', legacyHeaders: false,
    handler: (_req, res) => { res.status(429).json({ error: { code: 'RATE_LIMITED', message: 'Too many authentication attempts; try again later', requestId: res.locals.requestId } }); },
  });
  router.post('/register', limiter, async (req, res) => {
    const result = await service.register(parse(registration, req.body));
    const verification = await requestVerification(result!.user.id, options.sendEmail);
    res.status(201).json({ ...result, verification });
  });
  router.post('/login', limiter, async (req, res) => {
    const input = parse(credentials, req.body);
    res.json(await service.login(input.email, input.password));
  });
  router.post('/google', limiter, async (req, res) => {
    const input = parse(google, req.body);
    const result = await service.googleLogin(input.idToken);
    const { isNewUser, ...account } = result!;
    const verification = account.user.emailVerifiedAt ? { status: 'already_verified' } : isNewUser ? await requestVerification(account.user.id, options.sendEmail) : { status: 'required' };
    res.json({ ...account, verification });
  });
  const resendLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, limit: 5, standardHeaders: 'draft-8', legacyHeaders: false,
    handler: (_req, res) => { res.status(429).json({ error: { code: 'RATE_LIMITED', message: 'Too many resend requests; try again later', requestId: res.locals.requestId } }); },
  });
  router.post('/verify-email', limiter, async (req, res) => {
    const input = parse(z.object({ token: z.string().regex(/^[A-Za-z0-9_-]{43}$/) }).strict(), req.body);
    res.json(await verifyEmail(input.token));
  });
  router.post('/resend-verification', requireAuth, resendLimiter, async (_req, res) => {
    const result = await requestVerification(res.locals.auth.user.id, options.sendEmail);
    if (result.status === 'unavailable') throw new ApiError(503, 'EMAIL_UNAVAILABLE', 'Verification email could not be sent; please try again later');
    res.json({ verification: result });
  });
  router.get('/me', requireAuth, (_req, res) => { res.json({ user: res.locals.auth.user }); });
  router.post('/logout', requireAuth, async (_req, res) => {
    await service.logout(res.locals.auth.sessionId);
    res.status(204).end();
  });
  return router;
}
