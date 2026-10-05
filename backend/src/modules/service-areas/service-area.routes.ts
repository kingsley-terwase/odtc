import { Router } from 'express';
import { z } from 'zod';
import { ApiError } from '../../lib/api-error.js';
import { createSubdivision, updateSubdivision, listSubdivisions } from './subdivision.service.js';
import { createServiceArea, updateServiceArea, listServiceAreas } from './service-area.service.js';

const label = z.string().normalize().trim().transform(value => value.replace(/\s+/g, ' ')).pipe(z.string().min(1).max(120));
const areaSchema = z.object({
  name: label, state: label,
  countryCode: z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/, 'Use a two-letter country code'),
  type: z.enum(['CITY', 'LGA']), active: z.boolean().optional(),
}).strict();
const subdivisionSchema = z.object({ name: label, mapboxId: z.string().trim().min(1).max(300).nullable().optional(), active: z.boolean().optional() }).strict();
const subdivisionPatch = subdivisionSchema.partial().refine(input => Object.keys(input).length > 0, 'Provide at least one field');
const patchSchema = areaSchema.partial().refine(input => Object.keys(input).length > 0, 'Provide at least one field');
const listSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25),
  offset: z.coerce.number().int().min(0).max(100000).default(0),
  active: z.enum(['true', 'false']).transform(value => value === 'true').optional(),
}).strict();

function parse<T>(schema: z.ZodType<T>, input: unknown): T {
  const parsed = schema.safeParse(input);
  if (!parsed.success) throw new ApiError(400, 'VALIDATION_ERROR', parsed.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join('; '));
  return parsed.data;
}

// Mounted behind the admin router's authentication, verification and role guards.
export function createServiceAreaRouter() {
  const router = Router();
  router.get('/', async (req, res) => { res.json(await listServiceAreas(parse(listSchema, req.query))); });
  router.post('/', async (req, res) => {
    res.status(201).json({ area: await createServiceArea(res.locals.auth.user.id, parse(areaSchema, req.body)) });
  });
  router.patch('/:id', async (req, res) => {
    const id = parse(z.uuid(), req.params.id);
    res.json({ area: await updateServiceArea(id, parse(patchSchema, req.body)) });
  });
  router.get('/:id/subdivisions', async (req, res) => {
    res.json(await listSubdivisions(parse(z.uuid(), req.params.id), parse(listSchema, req.query)));
  });
  router.post('/:id/subdivisions', async (req, res) => {
    res.status(201).json({ subdivision: await createSubdivision(parse(z.uuid(), req.params.id), parse(subdivisionSchema, req.body)) });
  });
  router.patch('/:id/subdivisions/:subdivisionId', async (req, res) => {
    res.json({ subdivision: await updateSubdivision(parse(z.uuid(), req.params.id), parse(z.uuid(), req.params.subdivisionId), parse(subdivisionPatch, req.body)) });
  });
  return router;
}
