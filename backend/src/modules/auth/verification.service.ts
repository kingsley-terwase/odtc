import { createHash, randomBytes } from 'node:crypto';
import { prisma } from '../../lib/database.js';
import { env } from '../../config/env.js';
import { ApiError } from '../../lib/api-error.js';
import { sendTransactionalEmail, type EmailMessage } from '../../lib/email.js';

export type VerificationSender = (message: EmailMessage) => Promise<unknown>;
const digest = (token: string) => createHash('sha256').update(token).digest('hex');

export async function requestVerification(userId: string, sendEmail: VerificationSender = sendTransactionalEmail) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { email: true, emailVerifiedAt: true } });
  if (user.emailVerifiedAt) return { status: 'already_verified' as const };
  const now = new Date();
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(now.getTime() + env.VERIFICATION_TTL_MINUTES * 60_000);
  // A conditional write gives concurrent resends one winner and replaces the previous token.
  const claimed = await prisma.user.updateMany({
    where: {
      id: userId, emailVerifiedAt: null,
      OR: [
        { verificationRequestedAt: null },
        { verificationRequestedAt: { lte: new Date(now.getTime() - env.VERIFICATION_COOLDOWN_SECONDS * 1000) } },
      ],
    },
    data: { verificationTokenHash: digest(token), verificationExpiresAt: expiresAt, verificationRequestedAt: now },
  });
  if (!claimed.count) {
    const current = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { emailVerifiedAt: true } });
    if (current.emailVerifiedAt) return { status: 'already_verified' as const };
    throw new ApiError(429, 'VERIFICATION_COOLDOWN', 'Please wait before requesting another verification email');
  }
  const url = new URL(env.EMAIL_VERIFICATION_URL);
  // Fragments are not sent to the frontend web server or in HTTP Referer headers.
  url.hash = new URLSearchParams({ token }).toString();
  try {
    await sendEmail({
      to: user.email,
      subject: 'Verify your ODTC Logistics email',
      text: `Verify your email to book deliveries with ODTC Logistics.\n\n${url.toString()}\n\nThis link expires in ${env.VERIFICATION_TTL_MINUTES} minutes and can be used once. If you did not request this, you can ignore this email.`,
    });
    return { status: 'sent' as const };
  } catch {
    console.error('Verification email delivery failed');
    // Keep the account and token; the client can request another email after the cooldown.
    return { status: 'unavailable' as const };
  }
}

export async function verifyEmail(token: string) {
  const consumed = await prisma.user.updateMany({
    where: { verificationTokenHash: digest(token), verificationExpiresAt: { gt: new Date() }, emailVerifiedAt: null },
    data: { emailVerifiedAt: new Date(), verificationTokenHash: null, verificationExpiresAt: null },
  });
  if (!consumed.count) throw new ApiError(400, 'INVALID_VERIFICATION_TOKEN', 'Verification link is invalid, expired or already used');
  return { message: 'Email verified successfully' };
}
