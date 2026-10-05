import assert from 'node:assert/strict';
import { test } from 'node:test';

process.env.DATABASE_URL ??= 'postgresql://unused:unused@localhost:5432/unused';
const { createApp } = await import('../src/app.js');

test('auth rejects invalid input, missing credentials and excessive attempts before database work', async () => {
  const server = createApp().listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const base = `http://127.0.0.1:${address.port}/api/v1/auth`;
  try {
    const missing = await fetch(`${base}/me`);
    assert.equal(missing.status, 401);
    const invalid = await fetch(`${base}/register`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com', name: 'Test', password: 'long-password-123', role: 'ADMIN' }),
    });
    assert.equal(invalid.status, 400);
    assert.equal((await invalid.json()).error.code, 'VALIDATION_ERROR');
    assert.equal(invalid.headers.get('cache-control'), 'no-store');
    let finalStatus = 0;
    for (let i = 0; i < 30; i++) {
      finalStatus = (await fetch(`${base}/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })).status;
    }
    assert.equal(finalStatus, 429);
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});
