import { createHash, randomBytes } from 'node:crypto';
import { Prisma } from '../../generated/prisma/client.js';
import { prisma } from '../../lib/database.js';
import { env } from '../../config/env.js';
import { ApiError } from '../../lib/api-error.js';
import { hashPassword, verifyPassword } from './password.js';
import { verifyGoogleToken } from './google.js';

export const publicUser = {
  id: true, email: true, name: true, role: true, emailVerifiedAt: true, createdAt: true,
} satisfies Prisma.UserSelect;

export function tokenHash(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

function sessionData() {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + env.SESSION_TTL_HOURS * 60 * 60 * 1000);
  return { token, expiresAt, tokenHash: tokenHash(token) };
}

function uniqueConflict(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    throw new ApiError(409, 'ACCOUNT_EXISTS', 'An account already exists; sign in with your existing method');
  }
  throw error;
}

export async function register(input: { email: string; name: string; password: string }) {
  const passwordHash = await hashPassword(input.password);
  const session = sessionData();
  try {
    const user = await prisma.user.create({
      data: {
        email: input.email, name: input.name, passwordHash,
        sessions: { create: { tokenHash: session.tokenHash, expiresAt: session.expiresAt } },
      }, select: publicUser,
    });
    return { user, token: session.token, expiresAt: session.expiresAt };
  } catch (error) { uniqueConflict(error); }
}

async function createSession(userId: string) {
  const session = sessionData();
  await prisma.session.create({ data: { userId, tokenHash: session.tokenHash, expiresAt: session.expiresAt } });
  return { token: session.token, expiresAt: session.expiresAt };
}

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email }, select: { ...publicUser, passwordHash: true } });
  const valid = await verifyPassword(password, user?.passwordHash ?? null);
  if (!user || !valid) throw new ApiError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect');
  const { passwordHash: _passwordHash, ...safeUser } = user;
  return { user: safeUser, ...await createSession(user.id) };
}

export async function googleLogin(idToken: string, verifier = verifyGoogleToken) {
  const identity = await verifier(idToken);
  const existing = await prisma.user.findUnique({ where: { googleId: identity.googleId }, select: publicUser });
  if (existing) return { user: existing, ...await createSession(existing.id), isNewUser: false };
  // Never silently link a password account based on a matching email address.
  const session = sessionData();
  try {
    const user = await prisma.user.create({
      data: {
        ...identity,
        sessions: { create: { tokenHash: session.tokenHash, expiresAt: session.expiresAt } },
      }, select: publicUser,
    });
    return { user, token: session.token, expiresAt: session.expiresAt, isNewUser: true };
  } catch (error) { uniqueConflict(error); }
}

export async function authenticate(token: string) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) throw new ApiError(401, 'UNAUTHORIZED', 'A valid session is required');
  const session = await prisma.session.findUnique({
    where: { tokenHash: tokenHash(token) },
    select: { id: true, expiresAt: true, user: { select: publicUser } },
  });
  if (!session || session.expiresAt <= new Date()) throw new ApiError(401, 'UNAUTHORIZED', 'A valid session is required');
  return { sessionId: session.id, user: session.user };
}

export async function logout(sessionId: string) {
  await prisma.session.deleteMany({ where: { id: sessionId } });
}
