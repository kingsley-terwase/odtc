import { Router } from 'express';
import { listAdminBookings } from '../guest/guest.service.js';
import { z } from 'zod';
import { requireAuth, requireVerifiedEmail } from '../auth/auth.routes.js';
import { requireAdmin } from './admin.middleware.js';
import { ApiError } from '../../lib/api-error.js';
import { createServiceAreaRouter } from '../service-areas/service-area.routes.js';
import { getCurrentPricing, getPricingHistory, setPricing } from '../pricing/pricing.service.js';

// Strings preserve decimal money exactly; amounts are in naira, not kobo.
const money = z.string().regex(/^(0|[1-9]\d{0,9})(\.\d{1,2})?$/, 'Use a nonnegative naira amount with at most two decimal places');
const pricingSchema = z.object({
  ratePerKm: money.refine(value => !/^0(\.0{1,2})?$/.test(value), 'Rate per kilometre must be greater than zero'),
  minimumFare: money,
}).strict();

export function createAdminRouter() {
  const router = Router();
  router.use(requireAuth, requireVerifiedEmail, requireAdmin);
  router.use((_req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });
  router.get('/bookings', async (req, res) => {
    const paging = z.object({ limit: z.coerce.number().int().min(1).max(100).default(25), offset: z.coerce.number().int().min(0).max(100000).default(0) }).strict().safeParse(req.query);
    if (!paging.success) throw new ApiError(400, 'VALIDATION_ERROR', 'Provide valid pagination');
    res.json({ bookings: await listAdminBookings(paging.data.limit, paging.data.offset) });
  });
  router.get('/pricing', async (_req, res) => { res.json({ pricing: await getCurrentPricing() }); });
  router.post('/pricing', async (req, res) => {
    const input = pricingSchema.safeParse(req.body);
    if (!input.success) throw new ApiError(400, 'VALIDATION_ERROR', 'Provide ratePerKm and minimumFare as valid naira strings; ratePerKm must be greater than zero');
    const pricing = await setPricing(res.locals.auth.user.id, input.data);
    res.status(201).json({ pricing });
  });
  router.get('/pricing/history', async (_req, res) => { res.json({ pricing: await getPricingHistory() }); });
  router.use('/service-areas', createServiceAreaRouter());
  return router;
}
