import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createSendlibMailer } from '../src/lib/email.js';

const config = { apiKey: 'test-key', from: 'odtc@example.com', timeoutMs: 1000 };
const message = { to: 'client@example.com', subject: 'ODTC confirmation', text: 'Your booking is confirmed.' };

test('Sendlib sends expected authorization and message without real network calls', async () => {
  const send = createSendlibMailer(config, async (url, options) => {
    assert.equal(url, 'https://sendlib.samueltuoyo.com/api/send');
    assert.equal(options?.method, 'POST');
    assert.equal((options?.headers as Record<string, string>).Authorization, 'Bearer test-key');
    assert.equal(options?.redirect, 'error');
    assert.ok(options?.signal instanceof AbortSignal);
    assert.deepEqual(JSON.parse(options?.body as string), { from: config.from, ...message });
    return new Response('{}', { status: 202 });
  });
  assert.deepEqual(await send(message), { provider: 'sendlib', accepted: true });
});

test('missing config and invalid messages are rejected before contacting Sendlib', async () => {
  const transport: typeof fetch = async () => { assert.fail('Transport must not be called'); };
  await assert.rejects(createSendlibMailer({ timeoutMs: 1000 }, transport)(message), { code: 'EMAIL_NOT_CONFIGURED' });
  const send = createSendlibMailer(config, transport);
  await assert.rejects(send({ ...message, to: 'invalid' }), { code: 'INVALID_EMAIL' });
  await assert.rejects(send({ to: message.to, subject: 'No content' }), { code: 'INVALID_EMAIL' });
});

test('provider and network failures do not expose secrets or provider details', async () => {
  const rejected = createSendlibMailer(config, async () => new Response('secret provider detail', { status: 401 }));
  await assert.rejects(rejected(message), { code: 'EMAIL_REJECTED', message: 'Sendlib rejected the email request' });
  const unavailable = createSendlibMailer(config, async () => { throw new Error('test-key in a network error'); });
  await assert.rejects(unavailable(message), { code: 'EMAIL_UNAVAILABLE', message: 'Unable to reach Sendlib within the allowed time' });
});
