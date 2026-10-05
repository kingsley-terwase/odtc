import { createHmac, timingSafeEqual } from 'node:crypto';
import { Router, type RequestHandler } from 'express';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import { ApiError } from '../../lib/api-error.js';
import { env } from '../../config/env.js';
import { createGuestService } from './guest.service.js';
import type { GuestProviders } from './providers.js';
import type { VerificationSender } from '../auth/verification.service.js';

export type GuestOptions = { guestProviders?: GuestProviders; sendEmail?: VerificationSender };
const details = z.object({ quoteId: z.uuid(), fullName: z.string().trim().min(2).max(120), phone: z.string().trim().regex(/^\+?[\d ()-]{7,30}$/).refine(value => { const n = value.replace(/\D/g, '').length; return n >= 7 && n <= 15; }), email: z.string().trim().toLowerCase().pipe(z.email().max(254)), packageDescription: z.string().trim().min(1).max(2000), packageSize: z.string().trim().min(1).max(80).optional() }).strict();
function parse<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) throw new ApiError(400, 'VALIDATION_ERROR', 'Provide valid fields for this request');
  return result.data;
}
export function createGuestRouter(options: GuestOptions = {}) {
  const router = Router();
  const service = createGuestService(options.guestProviders, options.sendEmail);
  router.use((_req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });
  router.use(rateLimit({ windowMs: 15 * 60000, limit: 60, standardHeaders: 'draft-8', legacyHeaders: false, handler: (_req, res) => { res.status(429).json({ error: { code: 'RATE_LIMITED', message: 'Too many booking requests; try again later', requestId: res.locals.requestId } }); } }));
  router.get('/locations', async (req, res) => { const q = parse(z.string().trim().min(3).max(200), req.query.q); res.json({ locations: await service.search(q) }); });
  router.post('/quotes', async (req, res) => {
    const input = parse(z.object({ pickupId: z.string().min(1).max(300), deliveryId: z.string().min(1).max(300) }).strict(), req.body);
    res.status(201).json(await service.quote(input.pickupId, input.deliveryId));
  });
  router.post('/bookings', async (req, res) => { const result = await service.book(parse(details, req.body), req.get('X-Booking-Token')); res.status(result.reused ? 200 : 201).json({ booking: result.booking }); });
  router.get('/bookings/:id', async (req, res) => { res.json({ booking: await service.get(parse(z.uuid(), req.params.id), req.get('X-Booking-Token')) }); });
  router.post('/bookings/:id/payment', async (req, res) => { res.json(await service.initialize(parse(z.uuid(), req.params.id), req.get('X-Booking-Token'))); });
  router.post('/bookings/:id/verify-payment', async (req, res) => { res.json(await service.verify(parse(z.uuid(), req.params.id), req.get('X-Booking-Token'))); });
  return router;
}
export function paystackWebhook(options: GuestOptions = {}): RequestHandler {
  const service = createGuestService(options.guestProviders, options.sendEmail);
  return async (req, res) => {
    if (!env.PAYSTACK_SECRET_KEY) throw new ApiError(503, 'PAYSTACK_NOT_CONFIGURED', 'Paystack is not configured');
    const signature = req.get('X-Paystack-Signature');
    if (!Buffer.isBuffer(req.body) || !signature || !/^[a-f0-9]{128}$/i.test(signature)) throw new ApiError(401, 'INVALID_WEBHOOK_SIGNATURE', 'Invalid payment notification');
    const expected = createHmac('sha512', env.PAYSTACK_SECRET_KEY).update(req.body).digest();
    if (!timingSafeEqual(expected, Buffer.from(signature, 'hex'))) throw new ApiError(401, 'INVALID_WEBHOOK_SIGNATURE', 'Invalid payment notification');
    let event: unknown;
    try { event = JSON.parse(req.body.toString('utf8')); } catch { throw new ApiError(400, 'INVALID_JSON', 'Invalid payment notification'); }
    const parsed = z.object({ event: z.string(), data: z.object({ reference: z.string().max(100) }).passthrough() }).safeParse(event);
    if (!parsed.success) throw new ApiError(400, 'INVALID_WEBHOOK_EVENT', 'Invalid payment notification');
    if (parsed.data.event === 'charge.success') await service.settle(parsed.data.data.reference);
    res.status(200).json({ received: true });
  };
}
