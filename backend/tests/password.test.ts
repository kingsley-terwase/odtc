import assert from 'node:assert/strict';
import { test } from 'node:test';
import { hashPassword, verifyPassword } from '../src/modules/auth/password.js';

test('password hashing uses independent salts and rejects incorrect credentials', async () => {
  const password = 'A long test password 123!';
  const first = await hashPassword(password);
  const second = await hashPassword(password);
  assert.notEqual(first, second);
  assert.ok(!first.includes(password));
  assert.equal(await verifyPassword(password, first), true);
  assert.equal(await verifyPassword('Incorrect password', first), false);
  assert.equal(await verifyPassword(password, null), false);
});
