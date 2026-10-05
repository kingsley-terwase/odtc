import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { createApp } from '../../src/app.js';
import { prisma } from '../../src/lib/database.js';
import { tokenHash } from '../../src/modules/auth/auth.service.js';
import { requestVerification } from '../../src/modules/auth/verification.service.js';
import type { EmailMessage } from '../../src/lib/email.js';

function emailToken(message: EmailMessage) {
  const link = message.text?.match(/https?:\/\/[^\s]+/)?.[0];
  assert.ok(link);
  const url = new URL(link);
  assert.equal(url.searchParams.has('token'), false);
  const token = new URLSearchParams(url.hash.slice(1)).get('token');
  assert.ok(token);
  return token;
}

test('verification links expire, replace old links, are single-use and respect cooldowns', async () => {
  const marker = randomUUID();
  const email = `verify-test-${marker}@example.com`;
  const failureEmail = `verify-failure-${marker}@example.com`;
  const emails: EmailMessage[] = [];
  let failDelivery = false;
  const sendEmail = async (message: EmailMessage) => {
    if (failDelivery) throw new Error('Mock delivery failure');
    emails.push(message);
  };
  const server = createApp({ sendEmail }).listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const base = `http://127.0.0.1:${address.port}/api/v1/auth`;
  const post = (path: string, body: unknown, token?: string) => fetch(`${base}/${path}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body),
  });
  const ageRequest = () => prisma.user.update({ where: { email }, data: { verificationRequestedAt: new Date(0) } });
  try {
    const response = await post('register', { email, name: 'Verification Client', password: 'Test password 123!' });
    assert.equal(response.status, 201);
    const account = await response.json();
    assert.equal(account.verification.status, 'sent');
    assert.equal(emails.length, 1);
    const first = emailToken(emails[0]!);
    assert.ok(!JSON.stringify(account).includes(first));
    const stored = await prisma.user.findUniqueOrThrow({ where: { email } });
    assert.equal(stored.verificationTokenHash, tokenHash(first));
    assert.equal(stored.emailVerifiedAt, null);
    assert.equal((await post('resend-verification', {})).status, 401);
    assert.equal((await post('resend-verification', {}, account.token)).status, 429);
    assert.equal(emails.length, 1);

    await ageRequest();
    const resent = await post('resend-verification', {}, account.token);
    assert.equal(resent.status, 200);
    const replacement = emailToken(emails.at(-1)!);
    assert.notEqual(replacement, first);
    assert.equal((await post('verify-email', { token: first })).status, 400);
    assert.equal((await post('verify-email', { token: randomBytes(32).toString('base64url') })).status, 400);
    await prisma.user.update({ where: { email }, data: { verificationExpiresAt: new Date(0) } });
    assert.equal((await post('verify-email', { token: replacement })).status, 400);

    await ageRequest();
    const concurrent = await Promise.allSettled([
      requestVerification(account.user.id, sendEmail), requestVerification(account.user.id, sendEmail),
    ]);
    assert.equal(concurrent.filter(result => result.status === 'fulfilled').length, 1);
    assert.equal(concurrent.filter(result => result.status === 'rejected').length, 1);
    const current = emailToken(emails.at(-1)!);
    const consumed = await Promise.all([
      post('verify-email', { token: current }), post('verify-email', { token: current }),
    ]);
    assert.deepEqual(consumed.map(result => result.status).sort(), [200, 400]);
    assert.equal((await post('verify-email', { token: current })).status, 400);
    const verified = await prisma.user.findUniqueOrThrow({ where: { email } });
    assert.ok(verified.emailVerifiedAt);
    assert.equal(verified.verificationTokenHash, null);
    assert.equal(verified.verificationExpiresAt, null);
    const before = emails.length;
    const already = await post('resend-verification', {}, account.token);
    assert.equal(already.status, 200);
    assert.equal((await already.json()).verification.status, 'already_verified');
    assert.equal(emails.length, before);
    const me = await fetch(`${base}/me`, { headers: { Authorization: `Bearer ${account.token}` } });
    assert.ok((await me.json()).user.emailVerifiedAt);

    failDelivery = true;
    const failedRegistration = await post('register', { email: failureEmail, name: 'Delivery Failure', password: 'Test password 123!' });
    assert.equal(failedRegistration.status, 201);
    const failedAccount = await failedRegistration.json();
    assert.equal(failedAccount.verification.status, 'unavailable');
    assert.ok(await prisma.user.findUnique({ where: { email: failureEmail } }));
    await prisma.user.update({ where: { email: failureEmail }, data: { verificationRequestedAt: new Date(0) } });
    assert.equal((await post('resend-verification', {}, failedAccount.token)).status, 503);
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    await prisma.user.deleteMany({ where: { email: { in: [email, failureEmail] } } });
    await prisma.$disconnect();
  }
});
