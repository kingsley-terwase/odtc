import { randomUUID } from 'node:crypto';
import express, { type ErrorRequestHandler } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env.js';
import { ApiError } from './lib/api-error.js';
import { createAuthRouter } from './modules/auth/auth.routes.js';
import { createAdminRouter } from './modules/admin/admin.routes.js';
import { createGuestRouter, paystackWebhook, type GuestOptions } from './modules/guest/guest.routes.js';

export function createApp(options: GuestOptions = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: env.corsOrigins }));
  app.use((_req, res, next) => {
    res.locals.requestId = randomUUID();
    res.setHeader('X-Request-Id', res.locals.requestId);
    next();
  });
  app.post('/api/v1/payments/paystack/webhook', express.raw({ type: 'application/json', limit: '100kb' }), paystackWebhook(options));
  app.use(express.json({ limit: '100kb' }));

  app.get('/api/v1/health', (_req, res) => {
    res.status(200).json({ status: 'ok', service: 'odtc-logistics' });
  });

  app.use('/api/v1/guest', createGuestRouter(options));
  app.use('/api/v1/auth', createAuthRouter(options));
  app.use('/api/v1/admin', createAdminRouter());

  app.use((_req, res) => {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found', requestId: res.locals.requestId } });
  });

  const handleError: ErrorRequestHandler = (error: unknown, _req, res, next) => {
    if (res.headersSent) { next(error); return; }
    if (error instanceof ApiError) {
      res.status(error.status).json({ error: { code: error.code, message: error.message, requestId: res.locals.requestId } });
      return;
    }
    const type = typeof error === 'object' && error !== null && 'type' in error ? error.type : undefined;
    const status = type === 'entity.parse.failed' ? 400 : type === 'entity.too.large' ? 413 : 500;
    if (status === 500) console.error('Unhandled request error', { requestId: res.locals.requestId });
    const code = status === 400 ? 'INVALID_JSON' : status === 413 ? 'PAYLOAD_TOO_LARGE' : 'INTERNAL_ERROR';
    const message = status === 400 ? 'Request body must be valid JSON' : status === 413 ? 'Request body is too large' : 'An unexpected error occurred';
    res.status(status).json({ error: { code, message, requestId: res.locals.requestId } });
  };
  app.use(handleError);
  return app;
}
