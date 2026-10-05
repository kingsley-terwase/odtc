import { Prisma } from '../../generated/prisma/client.js';
import { prisma } from '../../lib/database.js';
import { ApiError } from '../../lib/api-error.js';

type AreaInput = { name: string; state: string; countryCode: string; type: 'CITY' | 'LGA'; active?: boolean };
const select = { id: true, name: true, state: true, countryCode: true, type: true, active: true, createdAt: true, updatedAt: true } satisfies Prisma.ServiceAreaSelect;
const normalize = (value: string) => value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();

function mapError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') throw new ApiError(409, 'SERVICE_AREA_EXISTS', 'This service area already exists; update its existing entry');
    if (error.code === 'P2025') throw new ApiError(404, 'SERVICE_AREA_NOT_FOUND', 'Service area not found');
  }
  throw error;
}

export async function createServiceArea(userId: string, input: AreaInput) {
  try {
    return await prisma.serviceArea.create({ data: {
      ...input, normalizedName: normalize(input.name), normalizedState: normalize(input.state), createdById: userId,
    }, select });
  } catch (error) { mapError(error); }
}

export async function updateServiceArea(id: string, input: Partial<AreaInput>) {
  try {
    return await prisma.serviceArea.update({ where: { id }, data: {
      ...input,
      ...(input.name !== undefined ? { normalizedName: normalize(input.name) } : {}),
      ...(input.state !== undefined ? { normalizedState: normalize(input.state) } : {}),
    }, select });
  } catch (error) { mapError(error); }
}

export async function listServiceAreas(input: { limit: number; offset: number; active?: boolean }) {
  const where = input.active === undefined ? {} : { active: input.active };
  const [areas, total] = await prisma.$transaction([
    prisma.serviceArea.findMany({ where, select, orderBy: [{ countryCode: 'asc' }, { normalizedState: 'asc' }, { normalizedName: 'asc' }, { id: 'asc' }], take: input.limit, skip: input.offset }),
    prisma.serviceArea.count({ where }),
  ], { isolationLevel: 'RepeatableRead' });
  return { areas, total, limit: input.limit, offset: input.offset };
}
