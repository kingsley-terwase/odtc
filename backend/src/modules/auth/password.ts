import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

function derive(password: string, salt: string) {
  return new Promise<Buffer>((resolve, reject) => {
    scrypt(password, salt, 64, { N: 131072, r: 8, p: 1, maxmem: 256 * 1024 * 1024 },
      (error, key) => error ? reject(error) : resolve(key));
  });
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const key = await derive(password, salt);
  return `scrypt$${salt}$${key.toString('hex')}`;
}

export async function verifyPassword(password: string, encoded: string | null) {
  const [algorithm, salt, hex] = (encoded ?? '').split('$');
  const valid = algorithm === 'scrypt' && /^[a-f0-9]{32}$/.test(salt ?? '') && /^[a-f0-9]{128}$/.test(hex ?? '');
  // Also hash absent accounts, keeping the expensive work consistent on failed login.
  const actual = await derive(password, valid ? salt! : '0'.repeat(32));
  const expected = valid ? Buffer.from(hex!, 'hex') : Buffer.alloc(64);
  return timingSafeEqual(actual, expected) && valid;
}
