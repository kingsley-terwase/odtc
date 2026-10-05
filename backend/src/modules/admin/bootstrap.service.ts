import { prisma } from '../../lib/database.js';
import { ApiError } from '../../lib/api-error.js';

export async function bootstrapFirstAdmin(email: string) {
  return prisma.$transaction(async tx => {
    // All bootstrap processes share a transaction-scoped lock, so only one can promote the first admin.
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(18476001)::text`;
    const current = await tx.user.findFirst({ where: { role: 'ADMIN' }, select: { id: true, email: true, role: true } });
    if (current) {
      if (current.email === email) return { user: current, promoted: false };
      throw new ApiError(409, 'ADMIN_ALREADY_EXISTS', 'An administrator already exists; bootstrap cannot add another');
    }
    const user = await tx.user.findUnique({ where: { email }, select: { id: true, emailVerifiedAt: true } });
    if (!user) throw new ApiError(404, 'ACCOUNT_NOT_FOUND', 'Register this account before running admin bootstrap');
    if (!user.emailVerifiedAt) throw new ApiError(403, 'EMAIL_NOT_VERIFIED', 'Verify the account email before admin bootstrap');
    const promoted = await tx.user.update({ where: { id: user.id }, data: { role: 'ADMIN' }, select: { id: true, email: true, role: true } });
    return { user: promoted, promoted: true };
  });
}
