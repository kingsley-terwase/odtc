import { Prisma } from '../../generated/prisma/client.js';
import { prisma } from '../../lib/database.js';
import { ApiError } from '../../lib/api-error.js';

const select = { id: true, ratePerKm: true, minimumFare: true, currency: true, createdAt: true } satisfies Prisma.PricingPolicySelect;

function serialize(policy: Prisma.PricingPolicyGetPayload<{ select: typeof select }>) {
  return { ...policy, ratePerKm: policy.ratePerKm.toFixed(2), minimumFare: policy.minimumFare.toFixed(2) };
}

export async function getCurrentPricing() {
  const policy = await prisma.pricingPolicy.findFirst({ orderBy: { id: 'desc' }, select });
  if (!policy) throw new ApiError(404, 'PRICING_NOT_CONFIGURED', 'An administrator must configure delivery pricing first');
  return serialize(policy);
}

export async function setPricing(userId: string, input: { ratePerKm: string; minimumFare: string }) {
  const policy = await prisma.pricingPolicy.create({
    data: { ratePerKm: new Prisma.Decimal(input.ratePerKm), minimumFare: new Prisma.Decimal(input.minimumFare), createdById: userId }, select,
  });
  return serialize(policy);
}

export async function getPricingHistory() {
  const policies = await prisma.pricingPolicy.findMany({ orderBy: { id: 'desc' }, take: 50, select });
  return policies.map(serialize);
}
