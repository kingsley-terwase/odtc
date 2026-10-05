import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Request, Response, NextFunction } from 'express';
process.env.DATABASE_URL ??= 'postgresql://unused:unused@localhost:5432/unused';
const { requireVerifiedEmail } = await import('../src/modules/auth/auth.routes.js');

test('booking guard requires authentication and a verified email', () => {
  const request = {} as Request;
  let calls = 0;
  const next: NextFunction = () => { calls++; };
  assert.throws(() => requireVerifiedEmail(request, { locals: {} } as Response, next), { status: 401 });
  assert.throws(() => requireVerifiedEmail(request, { locals: { auth: { user: { emailVerifiedAt: null } } } } as unknown as Response, next), { status: 403, code: 'EMAIL_NOT_VERIFIED' });
  requireVerifiedEmail(request, { locals: { auth: { user: { emailVerifiedAt: new Date() } } } } as unknown as Response, next);
  assert.equal(calls, 1);
});
