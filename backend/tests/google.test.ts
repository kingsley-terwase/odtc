import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { TokenPayload } from 'google-auth-library';
import { googleIdentity } from '../src/modules/auth/google.js';

const payload: TokenPayload = {
  iss: 'https://accounts.google.com', aud: 'test-client', sub: 'google-subject',
  iat: 1, exp: 2, email: 'Person@gmail.com', email_verified: true, name: 'Person',
};

test('Google identity uses subject and distinguishes authoritative email ownership', () => {
  const identity = googleIdentity(payload);
  assert.equal(identity.googleId, payload.sub);
  assert.equal(identity.email, 'person@gmail.com');
  assert.ok(identity.emailVerifiedAt instanceof Date);
  assert.equal(googleIdentity({ ...payload, email: 'person@example.com' }).emailVerifiedAt, null);
  assert.ok(googleIdentity({ ...payload, email: 'person@example.com', hd: 'example.com' }).emailVerifiedAt instanceof Date);
  assert.throws(() => googleIdentity({ ...payload, email_verified: false }), /could not be verified/);
  assert.throws(() => googleIdentity(undefined), /could not be verified/);
});
