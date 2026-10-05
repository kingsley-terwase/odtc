import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { createApp } from '../../src/app.js';
import { prisma } from '../../src/lib/database.js';
import { googleLogin, tokenHash } from '../../src/modules/auth/auth.service.js';

test('registration, sessions, expiry, logout and Google account conflicts against local PostgreSQL', async () => {
  const marker = randomUUID();
  const email = `auth-test-${marker}@example.com`;
  const googleEmail = `google-test-${marker}@example.com`;
  const server = createApp({ sendEmail: async () => ({ accepted: true }) }).listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const base = `http://127.0.0.1:${address.port}/api/v1/auth`;
  const post = (path: string, body: unknown, token?: string) => fetch(`${base}/${path}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
  const me = (token: string) => fetch(`${base}/me`, { headers: { Authorization: `Bearer ${token}` } });
  try {
    const registered = await post('register', { email: email.toUpperCase(), name: 'Test Client', password: 'Test password 123!' });
    assert.equal(registered.status, 201);
    const account = await registered.json();
    assert.equal(account.user.email, email);
    assert.equal(account.user.role, 'CLIENT');
    assert.equal(account.user.emailVerifiedAt, null);
    assert.equal(account.user.passwordHash, undefined);
    assert.equal(account.user.googleId, undefined);
    assert.equal((await me(account.token)).status, 200);
    const stored = await prisma.user.findUniqueOrThrow({ where: { email }, include: { sessions: true } });
    assert.notEqual(stored.passwordHash, 'Test password 123!');
    assert.equal(stored.sessions[0]?.tokenHash, tokenHash(account.token));
    assert.equal((await post('register', { email, name: 'Other', password: 'Other password 123!' })).status, 409);
    assert.equal((await post('login', { email, password: 'Wrong password 123!' })).status, 401);
    assert.equal((await post('login', { email: `missing-${marker}@example.com`, password: 'Wrong password 123!' })).status, 401);
    const login = await post('login', { email: '  ' + email.toUpperCase() + '  ', password: 'Test password 123!' });
    assert.equal(login.status, 200);
    const signedIn = await login.json();
    assert.notEqual(signedIn.token, account.token);
    await prisma.session.update({ where: { tokenHash: tokenHash(signedIn.token) }, data: { expiresAt: new Date(0) } });
    assert.equal((await me(signedIn.token)).status, 401);
    assert.equal((await post('logout', {}, account.token)).status, 204);
    assert.equal((await me(account.token)).status, 401);

    const fakeIdentity = { googleId: `google-${marker}`, email: googleEmail, name: 'Google Client', emailVerifiedAt: new Date() };
    const google = await googleLogin('test-only', async () => fakeIdentity);
    assert.equal(google!.user.role, 'CLIENT');
    assert.equal((await me(google!.token)).status, 200);
    const again = await googleLogin('test-only', async () => fakeIdentity);
    assert.equal(again!.user.id, google!.user.id);
    assert.equal((await post('login', { email: googleEmail, password: 'Random password 123!' })).status, 401);
    await assert.rejects(googleLogin('test-only', async () => ({ ...fakeIdentity, googleId: `collision-${marker}`, email })), { code: 'ACCOUNT_EXISTS' });
    assert.equal((await prisma.user.findUniqueOrThrow({ where: { email } })).googleId, null);
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    // Delete only this run's uniquely named test accounts; sessions cascade.
    await prisma.user.deleteMany({ where: { email: { in: [email, googleEmail] } } });
    await prisma.$disconnect();
  }
});
