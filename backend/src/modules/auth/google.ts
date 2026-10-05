import { OAuth2Client, type TokenPayload } from 'google-auth-library';
import { z } from 'zod';
import { env } from '../../config/env.js';
import { ApiError } from '../../lib/api-error.js';

const client = new OAuth2Client();
export function googleIdentity(payload: TokenPayload | undefined) {
  if (!payload?.sub || payload.email_verified !== true || !payload.email || !z.email().safeParse(payload.email).success) {
    throw new ApiError(401, 'INVALID_GOOGLE_TOKEN', 'Google sign-in could not be verified');
  }
  return {
    googleId: payload.sub,
    email: payload.email.trim().toLowerCase(),
    name: (payload.name || payload.email.split('@')[0] || 'Client').slice(0, 120),
    // Google is authoritative for Gmail and verified Workspace domains, not all third-party emails.
    emailVerifiedAt: payload.email.toLowerCase().endsWith('@gmail.com') || payload.hd ? new Date() : null,
  };
}

export async function verifyGoogleToken(idToken: string) {
  if (!env.GOOGLE_CLIENT_ID) throw new ApiError(503, 'GOOGLE_NOT_CONFIGURED', 'Google sign-in is not configured yet');
  try {
    const ticket = await client.verifyIdToken({ idToken, audience: env.GOOGLE_CLIENT_ID });
    return googleIdentity(ticket.getPayload());
  } catch {
    throw new ApiError(401, 'INVALID_GOOGLE_TOKEN', 'Google sign-in could not be verified');
  }
}
