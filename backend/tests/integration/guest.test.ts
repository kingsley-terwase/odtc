import assert from 'node:assert/strict';
import { createHash, createHmac, randomBytes, randomUUID } from 'node:crypto';
import { test } from 'node:test';
import type { GuestProviders, Location, PaymentResult } from '../../src/modules/guest/providers.js';
process.env.PAYSTACK_SECRET_KEY = 'sk_test_offline_fixture';
const { createApp } = await import('../../src/app.js');
const { prisma } = await import('../../src/lib/database.js');
const { sendBookingReceipt } = await import('../../src/modules/guest/receipt.service.js');

test('guest quotes, privacy, pricing snapshots, idempotent Paystack settlement and receipts', async () => {
  const marker = randomUUID();
  const owner = await prisma.user.create({ data: { email: `guest-fixture-${marker}@example.com`, name: 'Temporary fixture', role: 'ADMIN', emailVerifiedAt: new Date() } });
  const ids: string[] = [];
  const baseLocation: Location = { mapboxId: 'pickup', address: 'Pickup address', longitude: 3, latitude: 6, countryCode: 'ZZ', state: `Test State ${marker}`, cities: [`Test City ${marker}`], lgas: [] };
  const locations = [baseLocation, { ...baseLocation, mapboxId: 'delivery', address: 'Delivery address', longitude: 4 }];
  let distance = 18000; let initializes = 0; let receipts = 0; let failReceipt = false;
  const ledger = new Map<string, PaymentResult>();
  const providers: GuestProviders = {
    geocode: async query => query === 'search' ? locations : locations.filter(location => location.mapboxId === query),
    distance: async () => distance,
    initialize: async (email, amount, reference) => { initializes++; ledger.set(reference, { email, amount, reference, currency: 'NGN', status: 'pending' }); return 'https://checkout.paystack.com/offline'; },
    verify: async reference => { const item = ledger.get(reference); assert.ok(item); return item; },
  };
  const sender = async () => { if (failReceipt) throw new Error('Offline delivery failure'); receipts++; };
  const server = createApp({ guestProviders: providers, sendEmail: sender }).listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const address = server.address(); assert.ok(address && typeof address !== 'string');
  const base = `http://127.0.0.1:${address.port}/api/v1`;
  const request = (path: string, method = 'GET', body?: unknown, token?: string) => fetch(`${base}/${path}`, { method, headers: { 'Content-Type': 'application/json', ...(token ? { 'X-Booking-Token': token } : {}) }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
  const details = (quoteId: string) => ({ quoteId, fullName: 'Guest Person', phone: '+234 800 123 4567', email: 'guest@example.com', packageDescription: 'Documents' });
  async function quote() {
    const response = await request('guest/quotes', 'POST', { pickupId: 'pickup', deliveryId: 'delivery' });
    assert.equal(response.status, 201); const result = await response.json(); ids.push(result.quote.id); return result;
  }
  try {
    await prisma.serviceArea.create({ data: { name: baseLocation.cities[0]!, normalizedName: baseLocation.cities[0]!.toLowerCase(), state: baseLocation.state, normalizedState: baseLocation.state.toLowerCase(), countryCode: 'ZZ', type: 'CITY', createdById: owner.id } });
    const fixtureArea = await prisma.serviceArea.findFirstOrThrow({ where: { createdById: owner.id } });
    assert.equal((await request('guest/quotes', 'POST', { pickupId: 'pickup', deliveryId: 'delivery' })).status, 422);
    await prisma.serviceSubdivision.create({ data: { serviceAreaId: fixtureArea.id, name: baseLocation.cities[0]!, normalizedName: baseLocation.cities[0]!.toLowerCase() } });
    await prisma.pricingPolicy.create({ data: { ratePerKm: '50', minimumFare: '500', createdById: owner.id } });
    assert.equal((await request('guest/locations?q=se')).status, 400);
    assert.equal((await request('guest/locations?q=search')).status, 200);
    assert.equal((await request('guest/quotes', 'POST', { pickupId: 'pickup', deliveryId: 'pickup' })).status, 422);
    const initial = await quote();
    assert.equal(initial.quote.totalFare, '900.00'); assert.equal(initial.quote.accessTokenHash, undefined);
    await prisma.pricingPolicy.create({ data: { ratePerKm: '80', minimumFare: '800', createdById: owner.id } });
    assert.equal((await request('guest/bookings', 'POST', { ...details(initial.quote.id), totalFare: '1' }, initial.bookingToken)).status, 400);
    const booked = await request('guest/bookings', 'POST', details(initial.quote.id), initial.bookingToken);
    assert.equal(booked.status, 201); const booking = (await booked.json()).booking;
    assert.equal(booking.quote.totalFare, '900.00'); assert.equal(booking.packageSize, null); assert.equal(booking.status, 'AWAITING_PAYMENT');
    assert.equal((await request('guest/bookings', 'POST', details(initial.quote.id), initial.bookingToken)).status, 200);
    assert.equal((await request(`guest/bookings/${booking.id}`)).status, 404);
    assert.equal((await request(`guest/bookings/${booking.id}`, 'GET', undefined, 'x'.repeat(43))).status, 404);
    assert.equal((await request(`guest/bookings/${booking.id}`, 'GET', undefined, initial.bookingToken)).status, 200);
    const initialized = await Promise.all([request(`guest/bookings/${booking.id}/payment`, 'POST', {}, initial.bookingToken), request(`guest/bookings/${booking.id}/payment`, 'POST', {}, initial.bookingToken)]);
    assert.deepEqual(initialized.map(response => response.status), [200, 200]); assert.equal(initializes, 1);
    const payment = ledger.get(booking.reference)!; assert.equal(payment.amount, 90000);
    const pending = await request(`guest/bookings/${booking.id}/verify-payment`, 'POST', {}, initial.bookingToken);
    assert.equal(pending.status, 200); assert.equal((await pending.json()).status, 'AWAITING_PAYMENT'); assert.equal(receipts, 0);
    payment.status = 'success'; payment.amount++;
    assert.equal((await request(`guest/bookings/${booking.id}/verify-payment`, 'POST', {}, initial.bookingToken)).status, 409);
    payment.amount--; payment.currency = 'USD';
    assert.equal((await request(`guest/bookings/${booking.id}/verify-payment`, 'POST', {}, initial.bookingToken)).status, 409);
    payment.currency = 'NGN';
    const event = JSON.stringify({ event: 'charge.success', data: { reference: booking.reference } });
    const signature = createHmac('sha512', process.env.PAYSTACK_SECRET_KEY!).update(event).digest('hex');
    const webhook = (signatureValue: string) => fetch(`${base}/payments/paystack/webhook`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Paystack-Signature': signatureValue }, body: event });
    assert.equal((await webhook('0'.repeat(128))).status, 401);
    const confirmations = await Promise.all([webhook(signature), request(`guest/bookings/${booking.id}/verify-payment`, 'POST', {}, initial.bookingToken)]);
    assert.deepEqual(confirmations.map(response => response.status), [200, 200]); assert.equal(receipts, 1);
    assert.equal((await webhook(signature)).status, 200); assert.equal(receipts, 1);
    assert.equal((await request(`guest/bookings/${booking.id}/payment`, 'POST', {}, initial.bookingToken)).status, 409);
    assert.equal((await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } })).status, 'CONFIRMED');

    distance = 1000;
    const minimum = await quote(); assert.equal(minimum.quote.totalFare, '800.00');
    await prisma.deliveryQuote.update({ where: { id: minimum.quote.id }, data: { expiresAt: new Date(0) } });
    assert.equal((await request('guest/bookings', 'POST', details(minimum.quote.id), minimum.bookingToken)).status, 409);
    const unsupported = await quote();
    await prisma.serviceArea.updateMany({ where: { createdById: owner.id }, data: { active: false } });
    assert.equal((await request('guest/bookings', 'POST', details(unsupported.quote.id), unsupported.bookingToken)).status, 422);
    await prisma.serviceArea.updateMany({ where: { createdById: owner.id }, data: { active: true } });
    locations[1]!.state = 'Wrong State';
    assert.equal((await request('guest/quotes', 'POST', { pickupId: 'pickup', deliveryId: 'delivery' })).status, 422);
    locations[1]!.state = baseLocation.state;
    const retryQuote = await quote();
    const retryBooking = (await (await request('guest/bookings', 'POST', { ...details(retryQuote.quote.id), packageSize: 'Small' }, retryQuote.bookingToken)).json()).booking;
    await request(`guest/bookings/${retryBooking.id}/payment`, 'POST', {}, retryQuote.bookingToken);
    ledger.get(retryBooking.reference)!.status = 'success'; failReceipt = true;
    const confirmed = await request(`guest/bookings/${retryBooking.id}/verify-payment`, 'POST', {}, retryQuote.bookingToken);
    assert.equal(confirmed.status, 200); assert.equal((await confirmed.json()).receiptStatus, 'PENDING');
    await prisma.booking.update({ where: { id: retryBooking.id }, data: { receiptAttemptAt: new Date(0) } });
    failReceipt = false; await sendBookingReceipt(retryBooking.id, sender);
    // Approval is explicit, each subdivision has independent lifecycle and optional stable ID.
    const area = fixtureArea;
    const adminToken = randomBytes(32).toString('base64url');
    await prisma.session.create({ data: { tokenHash: createHash('sha256').update(adminToken).digest('hex'), userId: owner.id, expiresAt: new Date(Date.now() + 600000) } });
    const admin = (path: string, method: string, body?: unknown, authenticated = true) => fetch(`${base}/admin/service-areas/${area.id}${path}`, { method, headers: { 'Content-Type': 'application/json', ...(authenticated ? { Authorization: `Bearer ${adminToken}` } : {}) }, ...(body === undefined ? {} : {body: JSON.stringify(body)}) });
    assert.equal((await admin('/subdivisions', 'POST', { name: 'Subdivision' }, false)).status, 401);
    assert.equal((await admin('/subdivisions', 'POST', { name: '' })).status, 400);
    assert.equal((await admin('', 'PATCH', { aliases: ['Legacy'] })).status, 400);
    const created = await admin('/subdivisions', 'POST', { name: ' Subdivision   West ' });
    assert.equal(created.status, 201);
    const subdivision = (await created.json()).subdivision;
    assert.equal((await admin('/subdivisions', 'POST', { name: 'subdivision west' })).status, 409);
    const listing = await admin('/subdivisions?limit=1&offset=0', 'GET');
    const page = await listing.json(); assert.equal(page.total, 2); assert.equal(page.subdivisions.length, 1);
    locations[1]!.cities = ['SUBDIVISION WEST'];
    const approvalQuote = await quote();
    locations[1]!.state = 'Wrong State';
    assert.equal((await request('guest/quotes', 'POST', { pickupId: 'pickup', deliveryId: 'delivery' })).status, 422);
    locations[1]!.state = baseLocation.state;
    locations[1]!.countryCode = 'XY';
    assert.equal((await request('guest/quotes', 'POST', { pickupId: 'pickup', deliveryId: 'delivery' })).status, 422);
    locations[1]!.countryCode = 'ZZ';
    locations[1]!.cities = ['Subdivision West Outside'];
    assert.equal((await request('guest/quotes', 'POST', { pickupId: 'pickup', deliveryId: 'delivery' })).status, 422);
    const route = `/subdivisions/${subdivision.id}`;
    assert.equal((await admin(route, 'PATCH', { active: false })).status, 200);
    assert.equal((await request('guest/bookings', 'POST', details(approvalQuote.quote.id), approvalQuote.bookingToken)).status, 422);
    assert.equal((await admin(route, 'PATCH', { active: true, mapboxId: 'mapbox-area-id' })).status, 200);
    locations[1]!.cities = ['Subdivision West'];
    assert.equal((await request('guest/quotes', 'POST', { pickupId: 'pickup', deliveryId: 'delivery' })).status, 422);
    locations[1]!.areaFeatures = [{ mapboxId: 'mapbox-area-id', name: 'Renamed Area', type: 'place' }];
    const pinnedQuote = await quote();
    assert.equal((await request('guest/bookings', 'POST', details(pinnedQuote.quote.id), pinnedQuote.bookingToken)).status, 201);
    assert.equal((await admin(`/subdivisions/${randomUUID()}`, 'PATCH', {active: false})).status, 404);

    assert.equal((await prisma.booking.findUniqueOrThrow({ where: { id: retryBooking.id } })).receiptStatus, 'SENT');
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    await prisma.booking.deleteMany({ where: { quoteId: { in: ids } } });
    await prisma.deliveryQuote.deleteMany({ where: { pricingPolicy: { createdById: owner.id } } });
    await prisma.serviceArea.deleteMany({ where: { createdById: owner.id } });
    await prisma.pricingPolicy.deleteMany({ where: { createdById: owner.id } });
    await prisma.user.delete({ where: { id: owner.id } });
    await prisma.$disconnect();
  }
});
