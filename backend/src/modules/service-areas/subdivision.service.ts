import { Prisma } from '../../generated/prisma/client.js';
import { prisma } from '../../lib/database.js';
import { ApiError } from '../../lib/api-error.js';
type Input = { name: string; mapboxId?: string | null; active?: boolean };
const normalize = (value: string) => value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();
async function parent(tx: Prisma.TransactionClient, id: string) {
  const rows = await tx.$queryRaw<{id: string}[]>`SELECT id FROM "ServiceArea" WHERE id = ${id}::uuid FOR UPDATE`;
  if (!rows.length) throw new ApiError(404, 'SERVICE_AREA_NOT_FOUND', 'Service area not found');
}
function fail(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new ApiError(409, 'SUBDIVISION_EXISTS', 'This subdivision name or Mapbox ID is already approved under this service area');
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') throw new ApiError(404, 'SUBDIVISION_NOT_FOUND', 'Subdivision not found under this service area');
  throw error;
}
export async function createSubdivision(serviceAreaId: string, input: Input) {
  try { return await prisma.$transaction(async tx => {
    await parent(tx, serviceAreaId);
    return tx.serviceSubdivision.create({ data: { ...input, serviceAreaId, normalizedName: normalize(input.name) } });
  }); } catch (error) { fail(error); }
}
export async function updateSubdivision(serviceAreaId: string, id: string, input: Partial<Input>) {
  try { return await prisma.$transaction(async tx => {
    await parent(tx, serviceAreaId);
    return tx.serviceSubdivision.update({ where: { id, serviceAreaId }, data: { ...input, ...(input.name !== undefined ? { normalizedName: normalize(input.name) } : {}) } });
  }); } catch (error) { fail(error); }
}
export async function listSubdivisions(serviceAreaId: string, input: {limit: number; offset: number; active?: boolean}) {
  if (!await prisma.serviceArea.findUnique({ where: { id: serviceAreaId }, select: { id: true } })) throw new ApiError(404, 'SERVICE_AREA_NOT_FOUND', 'Service area not found');
  const where = { serviceAreaId, ...(input.active === undefined ? {} : { active: input.active }) };
  const [subdivisions, total] = await prisma.$transaction([
    prisma.serviceSubdivision.findMany({ where, orderBy: [{normalizedName: 'asc'}, {id: 'asc'}], take: input.limit, skip: input.offset }),
    prisma.serviceSubdivision.count({ where }),
  ], { isolationLevel: 'RepeatableRead' });
  return { subdivisions, total, limit: input.limit, offset: input.offset };
}
