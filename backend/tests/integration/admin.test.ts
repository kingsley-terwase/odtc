import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { createApp } from '../../src/app.js';
import { prisma } from '../../src/lib/database.js';
import { tokenHash } from '../../src/modules/auth/auth.service.js';
import { bootstrapFirstAdmin } from '../../src/modules/admin/bootstrap.service.js';

test('first-admin bootstrap, role enforcement, pricing versions and named service areas', async context => {
  const marker = randomUUID();
  const emails: string[] = [];
  async function account(label: string, role: 'CLIENT' | 'ADMIN', verified: boolean) {
    const email = `admin-test-${label}-${marker}@example.com`;
    emails.push(email);
    const token = randomBytes(32).toString('base64url');
    const user = await prisma.user.create({ data: {
      email, name: 'Temporary Admin Test', role, emailVerifiedAt: verified ? new Date() : null,
      sessions: { create: { tokenHash: tokenHash(token), expiresAt: new Date(Date.now() + 600000) } },
    } });
    return { user, token };
  }
  const server = createApp({ sendEmail: async () => ({ accepted: true }) }).listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const base = `http://127.0.0.1:${address.port}/api/v1/admin`;
  const request = (path: string, method = 'GET', body?: unknown, token?: string) => fetch(`${base}/${path}`, {
    method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  try {
    if (await prisma.user.count({ where: { role: 'ADMIN' } }) === 0) {
      const unverified = await account('bootstrap-unverified', 'CLIENT', false);
      await assert.rejects(bootstrapFirstAdmin(unverified.user.email), { code: 'EMAIL_NOT_VERIFIED' });
      await assert.rejects(bootstrapFirstAdmin(`missing-${marker}@example.com`), { code: 'ACCOUNT_NOT_FOUND' });
      const first = await account('bootstrap-first', 'CLIENT', true);
      const second = await account('bootstrap-second', 'CLIENT', true);
      const race = await Promise.allSettled([bootstrapFirstAdmin(first.user.email), bootstrapFirstAdmin(second.user.email)]);
      const success = race.filter(result => result.status === 'fulfilled');
      assert.equal(success.length, 1);
      assert.equal(race.filter(result => result.status === 'rejected').length, 1);
      const winner = (success[0] as PromiseFulfilledResult<Awaited<ReturnType<typeof bootstrapFirstAdmin>>>).value;
      assert.equal((await bootstrapFirstAdmin(winner.user.email)).promoted, false);
      const other = winner.user.email === first.user.email ? second.user.email : first.user.email;
      await assert.rejects(bootstrapFirstAdmin(other), { code: 'ADMIN_ALREADY_EXISTS' });
      await prisma.user.deleteMany({ where: { email: { in: [unverified.user.email, first.user.email, second.user.email] } } });
    } else {
      context.diagnostic('Bootstrap creation checks skipped because an existing real admin is present; no real account changed.');
    }
    const admin = await account('admin', 'ADMIN', true);
    const client = await account('client', 'CLIENT', true);
    const unverifiedAdmin = await account('unverified-admin', 'ADMIN', false);
    assert.equal((await request('pricing')).status, 401);
    assert.equal((await request('pricing', 'GET', undefined, client.token)).status, 403);
    assert.equal((await request('pricing', 'GET', undefined, unverifiedAdmin.token)).status, 403);
    assert.equal((await request('service-areas', 'POST', {}, client.token)).status, 403);
    assert.equal((await request('pricing', 'POST', { ratePerKm: '0', minimumFare: '500' }, admin.token)).status, 400);
    assert.equal((await request('pricing', 'POST', { ratePerKm: 50, minimumFare: 500 }, admin.token)).status, 400);
    assert.equal((await request('pricing', 'POST', { ratePerKm: '50.001', minimumFare: '500' }, admin.token)).status, 400);
    const firstPrice = await request('pricing', 'POST', { ratePerKm: '50.25', minimumFare: '500' }, admin.token);
    assert.equal(firstPrice.status, 201);
    const price = (await firstPrice.json()).pricing;
    assert.equal(price.ratePerKm, '50.25');
    assert.equal(price.minimumFare, '500.00');
    assert.equal(price.currency, 'NGN');
    const nextPrice = await request('pricing', 'POST', { ratePerKm: '75', minimumFare: '750.50' }, admin.token);
    assert.equal(nextPrice.status, 201);
    const latest = (await nextPrice.json()).pricing;
    assert.ok(latest.id > price.id);
    assert.equal((await (await request('pricing', 'GET', undefined, admin.token)).json()).pricing.id, latest.id);
    assert.equal((await prisma.pricingPolicy.findUniqueOrThrow({ where: { id: price.id } })).ratePerKm.toFixed(2), '50.25');
    const history = (await (await request('pricing/history', 'GET', undefined, admin.token)).json()).pricing;
    assert.equal(history[0].id, latest.id);
    assert.equal(history[1].id, price.id);

    const area = { name: `Test City ${marker}`, state: 'Test State', countryCode: 'ng', type: 'CITY' };
    const created = await request('service-areas', 'POST', area, admin.token);
    assert.equal(created.status, 201);
    const storedArea = (await created.json()).area;
    assert.equal(storedArea.countryCode, 'NG');
    assert.equal(storedArea.active, true);
    const duplicate = { ...area, name: '  ' + area.name.toUpperCase().replaceAll(' ', '  ') + '  ', state: area.state.toUpperCase() };
    assert.equal((await request('service-areas', 'POST', duplicate, admin.token)).status, 409);
    assert.equal((await request('service-areas', 'POST', { ...area, type: 'UNKNOWN' }, admin.token)).status, 400);
    assert.equal((await request(`service-areas/${storedArea.id}`, 'PATCH', {}, admin.token)).status, 400);
    assert.equal((await request(`service-areas/${randomUUID()}`, 'PATCH', { active: false }, admin.token)).status, 404);
    const deactivated = await request(`service-areas/${storedArea.id}`, 'PATCH', { active: false }, admin.token);
    assert.equal(deactivated.status, 200);
    assert.equal((await deactivated.json()).area.active, false);
    const listing = await request('service-areas?active=false&limit=100', 'GET', undefined, admin.token);
    assert.equal(listing.status, 200);
    assert.ok((await listing.json()).areas.some((item: { id: string }) => item.id === storedArea.id));
    assert.equal((await request('service-areas?limit=1000', 'GET', undefined, admin.token)).status, 400);
    assert.equal((await request(`service-areas/${storedArea.id}`, 'PATCH', { active: true, name: area.name + ' Updated' }, admin.token)).status, 200);

    // Existing session tokens must see role changes, rather than retaining stale admin privileges.
    await prisma.user.update({ where: { id: admin.user.id }, data: { role: 'CLIENT' } });
    assert.equal((await request('pricing', 'GET', undefined, admin.token)).status, 403);
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    const users = await prisma.user.findMany({ where: { email: { in: emails } }, select: { id: true } });
    const ids = users.map(user => user.id);
    await prisma.serviceArea.deleteMany({ where: { createdById: { in: ids } } });
    await prisma.pricingPolicy.deleteMany({ where: { createdById: { in: ids } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    await prisma.$disconnect();
  }
});
