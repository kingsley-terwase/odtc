import type { RequestHandler } from 'express';
import { ApiError } from '../../lib/api-error.js';

export const requireAdmin: RequestHandler = (_req, res, next) => {
  if (!res.locals.auth) throw new ApiError(401, 'UNAUTHORIZED', 'A valid session is required');
  if (res.locals.auth.user.role !== 'ADMIN') throw new ApiError(403, 'ADMIN_REQUIRED', 'Administrator access is required');
  next();
};
