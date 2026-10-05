import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { Prisma } from '../../generated/prisma/client.js';
import { prisma } from '../../lib/database.js';
import { env } from '../../config/env.js';
import { ApiError } from '../../lib/api-error.js';
import { providers, type GuestProviders, type Location } from './providers.js';
import { sendBookingReceipt } from './receipt.service.js';
import type { VerificationSender } from '../auth/verification.service.js';

const hash = (value: string) => createHash('sha256').update(value).digest('hex');
const normalize = (value: string) => value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();
async function countries() {
  const areas = await prisma.serviceArea.findMany({ where: { active: true }, select: { countryCode: true }, distinct: ['countryCode'] });
  if (!areas.length) throw new ApiError(503, 'SERVICE_AREAS_NOT_CONFIGURED', 'Delivery service areas are not configured');
  return areas.map(area => area.countryCode.toLowerCase());
}
async function supported(location: Location, db: Pick<Prisma.TransactionClient, 'serviceSubdivision'> = prisma) {
  const state = normalize(location.state).replace(/ state$/, '');
  const names = [...new Set([...location.cities, ...location.lgas].map(normalize))];
  const ids = location.areaFeatures?.map(area => area.mapboxId) ?? [];
  const subdivision = await db.serviceSubdivision.findFirst({ where: {
    active: true,
    serviceArea: { active: true, countryCode: location.countryCode, normalizedState: { in: [state, state + ' state'] } },
    OR: [{ mapboxId: null, normalizedName: { in: names } }, ...(ids.length ? [{ mapboxId: { in: ids } }] : [])],
  }, select: { id: true } });
  if (!subdivision) throw new ApiError(422, 'LOCATION_NOT_SUPPORTED', 'Both pickup and delivery must match active admin-approved subdivisions with matching state and country');
  return subdivision.id;
}
function authorized(expected: string, token: string | undefined) {
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token) || hash(token) !== expected) throw new ApiError(404, 'BOOKING_NOT_FOUND', 'Booking or quote not found');
}
export function serializeQuote(quote: { id: string; pickup: unknown; delivery: unknown; distanceMeters: Prisma.Decimal; ratePerKm: Prisma.Decimal; minimumFare: Prisma.Decimal; totalFare: Prisma.Decimal; pricingPolicyId: number; expiresAt: Date }) {
  return { ...quote, distanceMeters: quote.distanceMeters.toFixed(2), ratePerKm: quote.ratePerKm.toFixed(2), minimumFare: quote.minimumFare.toFixed(2), totalFare: quote.totalFare.toFixed(2), currency: 'NGN' };
}
const quoteSelect = { id: true, pickup: true, delivery: true, distanceMeters: true, ratePerKm: true, minimumFare: true, totalFare: true, pricingPolicyId: true, expiresAt: true } satisfies Prisma.DeliveryQuoteSelect;
const bookingSelect = { id: true, reference: true, fullName: true, phone: true, email: true, packageDescription: true, packageSize: true, status: true, receiptStatus: true, createdAt: true, quote: { select: quoteSelect } } satisfies Prisma.BookingSelect;
export function createGuestService(api: GuestProviders = providers, sendEmail?: VerificationSender) {
  return {
    async search(query: string) {
      const results = await api.geocode(query, await countries(), false);
      return results.map(location => ({ mapboxId: location.mapboxId, address: location.address, state: location.state, countryCode: location.countryCode, areaFeatures: location.areaFeatures ?? [], cities: location.cities, lgas: location.lgas }));
    },
    async quote(pickupId: string, deliveryId: string) {
      if (pickupId === deliveryId) throw new ApiError(422, 'IDENTICAL_LOCATIONS', 'Pickup and delivery must be different locations');
      const allowedCountries = await countries();
      const [pickupResults, deliveryResults] = await Promise.all([api.geocode(pickupId, allowedCountries, true), api.geocode(deliveryId, allowedCountries, true)]);
      const pickup = pickupResults.find(location => location.mapboxId === pickupId);
      const delivery = deliveryResults.find(location => location.mapboxId === deliveryId);
      if (!pickup || !delivery) throw new ApiError(422, 'INVALID_LOCATION', 'Select valid locations from the search results');
      await Promise.all([supported(pickup), supported(delivery)]);
      const pricing = await prisma.pricingPolicy.findFirst({ orderBy: { id: 'desc' } });
      if (!pricing) throw new ApiError(503, 'PRICING_NOT_CONFIGURED', 'Delivery pricing is not configured');
      const distance = new Prisma.Decimal(await api.distance(pickup, delivery)).toDecimalPlaces(2);
      if (!distance.isPositive()) throw new ApiError(422, 'INVALID_DISTANCE', 'Select distinct locations with a usable driving route');
      const total = Prisma.Decimal.max(distance.mul(pricing.ratePerKm).div(1000).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP), pricing.minimumFare);
      if (!total.isPositive()) throw new ApiError(422, 'FARE_TOO_SMALL', 'The calculated fare is below one kobo; configure an appropriate minimum fare');
      // NGN subunits must remain safely representable for the payment API.
      if (total.greaterThan('9999999999.99') || total.mul(100).greaterThan(Number.MAX_SAFE_INTEGER)) throw new ApiError(422, 'FARE_TOO_LARGE', 'Fare exceeds the supported payment amount');
      const token = randomBytes(32).toString('base64url');
      const quote = await prisma.deliveryQuote.create({ data: {
        pickup: pickup as unknown as Prisma.InputJsonValue, delivery: delivery as unknown as Prisma.InputJsonValue,
        distanceMeters: distance, ratePerKm: pricing.ratePerKm, minimumFare: pricing.minimumFare, totalFare: total,
        pricingPolicyId: pricing.id, accessTokenHash: hash(token), expiresAt: new Date(Date.now() + env.QUOTE_TTL_MINUTES * 60000),
      }, select: quoteSelect });
      return { quote: serializeQuote(quote), bookingToken: token };
    },
    async book(input: { quoteId: string; fullName: string; phone: string; email: string; packageDescription: string; packageSize?: string }, token?: string) {
      const quote = await prisma.deliveryQuote.findUnique({ where: { id: input.quoteId } });
      if (!quote) throw new ApiError(404, 'BOOKING_NOT_FOUND', 'Booking or quote not found');
      authorized(quote.accessTokenHash, token);
      const existing = await prisma.booking.findUnique({ where: { quoteId: quote.id }, select: bookingSelect });
      if (existing) return { booking: { ...existing, quote: serializeQuote(existing.quote) }, reused: true };
      if (quote.expiresAt <= new Date()) throw new ApiError(409, 'QUOTE_EXPIRED', 'Get a new delivery quote before booking');
      try {
        const booking = await prisma.$transaction(async tx => {
          // Lock area rows against admin edits until booking creation commits.
          const pickup = quote.pickup as unknown as Location;
          const delivery = quote.delivery as unknown as Location;
          await tx.$queryRaw`SELECT id FROM "ServiceArea" WHERE "countryCode" IN (${pickup.countryCode}, ${delivery.countryCode}) ORDER BY id FOR SHARE`;
          await Promise.all([supported(pickup, tx), supported(delivery, tx)]);
          if (quote.expiresAt <= new Date()) throw new ApiError(409, 'QUOTE_EXPIRED', 'Get a new delivery quote before booking');
          return tx.booking.create({ data: { ...input, reference: `ODTC-${randomUUID()}`, accessTokenHash: quote.accessTokenHash }, select: bookingSelect });
        });
        return { booking: { ...booking, quote: serializeQuote(booking.quote) }, reused: false };
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          const booking = await prisma.booking.findUniqueOrThrow({ where: { quoteId: quote.id }, select: bookingSelect });
          return { booking: { ...booking, quote: serializeQuote(booking.quote) }, reused: true };
        }
        throw error;
      }
    },
    async get(id: string, token?: string) {
      const booking = await prisma.booking.findUnique({ where: { id }, select: { ...bookingSelect, accessTokenHash: true } });
      if (!booking) throw new ApiError(404, 'BOOKING_NOT_FOUND', 'Booking or quote not found');
      authorized(booking.accessTokenHash, token);
      const { accessTokenHash: _hash, ...safe } = booking;
      return { ...safe, quote: serializeQuote(safe.quote) };
    },
    async initialize(id: string, token?: string) {
      await this.get(id, token);
      return prisma.$transaction(async tx => {
        await tx.$queryRaw`SELECT id FROM "Booking" WHERE id = ${id}::uuid FOR UPDATE`;
        const booking = await tx.booking.findUniqueOrThrow({ where: { id }, include: { quote: true } });
        if (booking.status === 'CONFIRMED') throw new ApiError(409, 'ALREADY_PAID', 'This booking is already paid');
        if (booking.authorizationUrl) return { authorizationUrl: booking.authorizationUrl, reference: booking.reference };
        const url = await api.initialize(booking.email, booking.quote.totalFare.mul(100).toNumber(), booking.reference);
        await tx.booking.update({ where: { id }, data: { authorizationUrl: url } });
        return { authorizationUrl: url, reference: booking.reference };
      }, { timeout: 20000 });
    },
    async settle(reference: string) {
      const booking = await prisma.booking.findUnique({ where: { reference }, include: { quote: true } });
      if (!booking) throw new ApiError(404, 'BOOKING_NOT_FOUND', 'Booking not found');
      const result = await api.verify(reference);
      if (result.reference !== reference || result.currency !== 'NGN' || result.amount !== booking.quote.totalFare.mul(100).toNumber() || result.email.toLowerCase() !== booking.email.toLowerCase()) throw new ApiError(409, 'PAYMENT_MISMATCH', 'Payment details do not match the booking');
      if (result.status === 'success') {
        await prisma.booking.updateMany({ where: { id: booking.id, status: 'AWAITING_PAYMENT' }, data: { status: 'CONFIRMED', paidAt: new Date() } });
        await sendBookingReceipt(booking.id, sendEmail);
      }
      const current = await prisma.booking.findUniqueOrThrow({ where: { id: booking.id }, select: { status: true, receiptStatus: true } });
      return { reference, ...current, paymentStatus: result.status };
    },
    async verify(id: string, token?: string) {
      const booking = await this.get(id, token);
      return this.settle(booking.reference);
    },
  };
}
export async function listAdminBookings(limit: number, offset: number) {
  const bookings = await prisma.booking.findMany({ select: bookingSelect, orderBy: { createdAt: 'desc' }, take: limit, skip: offset });
  return bookings.map(booking => ({ ...booking, quote: serializeQuote(booking.quote) }));
}
